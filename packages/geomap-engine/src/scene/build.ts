import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { GeoMapContent, GeoSourceSpec, EntitySpec } from '../schema.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', `geomap: duplicate id "${id}"`);
  }
  seen.add(id);
}

function resolveSourceData(source: GeoSourceSpec, resolveAsset: (id: string) => string | Uint8Array): Record<string, unknown> | undefined {
  if (source.data) return source.data as Record<string, unknown>;
  if (source.uri) {
    const resolved = resolveAsset(source.uri);
    if (typeof resolved === 'string') {
      try {
        return JSON.parse(resolved) as Record<string, unknown>;
      } catch {
        throw new EngineError('RESOURCE_ERROR', `geomap: source "${source.id}" uri "${source.uri}" is not valid JSON`);
      }
    }
    throw new EngineError('RESOURCE_ERROR', `geomap: source "${source.id}" uri "${source.uri}" could not be resolved`);
  }
  throw new EngineError('INVALID_SPEC', `geomap: source "${source.id}" has neither data nor uri`);
}

export function buildScene(
  content: GeoMapContent,
  resolveAsset: (id: string) => string | Uint8Array,
): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const geography = content.geography;
  const sources = geography?.sources ?? [];
  const entities = content.entities ?? [];
  const layers = content.layers ?? [];

  const sourceById = new Map<string, { source: GeoSourceSpec; featureIndex: Map<string, Record<string, unknown>> }>();

  for (const source of sources) {
    assertUnique(seen, source.id);
    const data = resolveSourceData(source, resolveAsset);
    const features = (data?.features as Array<Record<string, unknown>>) ?? [];
    const featureIndex = new Map<string, Record<string, unknown>>();
    for (const f of features) {
      const fid = f.id as string | undefined;
      if (fid) {
        if (featureIndex.has(fid)) {
          throw new EngineError('INVALID_ENTITY', `geomap: duplicate feature id "${fid}" in source "${source.id}"`);
        }
        featureIndex.set(fid, f);
      }
    }
    sourceById.set(source.id, { source, featureIndex });
  }

  const entityById = new Map<string, EntitySpec>();
  for (const entity of entities) {
    assertUnique(seen, entity.id);
    entityById.set(entity.id, entity);
  }

  for (const layer of layers) {
    assertUnique(seen, layer.id);

    for (const item of layer.items) {
      const itemRecord = item as Record<string, unknown>;
      const entityId = itemRecord.entity as string | undefined;
      const routeId = itemRecord.id as string | undefined;
      const path = itemRecord.path as string[] | undefined;

      if (layer.type === 'route') {
        if (!routeId || !path) continue;
        const routeNodeId = `geom-${layer.id}-${routeId}`;
        assertUnique(seen, routeNodeId);

        const segmentNodes: SceneNode[] = [];
        for (let i = 0; i < path.length; i++) {
          const segId = `geom-${layer.id}-${routeId}-seg-${i}`;
          const entity = entityById.get(path[i]!);
          if (!entity) {
            throw new EngineError('INVALID_REFERENCE', `geomap: route "${routeId}" path references unknown entity "${path[i]}"`);
          }
          const segNode: SceneNode = {
            id: segId,
            role: 'route-segment',
            kind: 'route-segment',
            label: entity.name,
            description: entity.description,
            interactive: false,
            metadata: {
              entityId: entity.id,
              entityType: entity.type,
              name: entity.name,
              entityIndex: i,
              location: entity.location,
              links: entity.links ?? undefined,
            },
            children: [],
          };
          segmentNodes.push(segNode);
        }

        const routeNode: SceneNode = {
          id: routeNodeId,
          role: 'route',
          kind: 'route',
          label: layer.title ?? routeId,
          interactive: false,
          metadata: { layerId: layer.id, routeId },
          children: segmentNodes,
        };
        semantics[routeNodeId] = routeNode;
        nodes.push(routeNode);
        continue;
      }

      if (entityId) {
        const entity = entityById.get(entityId);
        if (!entity) {
          throw new EngineError('INVALID_REFERENCE', `geomap: layer "${layer.id}" item references unknown entity "${entityId}"`);
        }

        const nodeId = `geom-${layer.id}-${entityId}`;
        assertUnique(seen, nodeId);

        const isMarker = layer.type === 'marker' || layer.type === 'label';
        const node: SceneNode = {
          id: nodeId,
          role: isMarker ? 'marker' : 'region',
          kind: layer.type === 'label' ? 'label' : layer.type === 'marker' ? 'marker' : 'region',
          label: entity.name,
          description: entity.description,
          interactive: itemRecord.interactive !== false,
          acceptsActions: itemRecord.interactive !== false ? ['select', 'focus'] : undefined,
          metadata: {
            entityId: entity.id,
            entityType: entity.type,
            name: entity.name,
            description: entity.description,
            location: entity.location,
            sourceClass: undefined,
            links: entity.links ?? undefined,
          },
          children: [],
        };

        // Resolve location metadata
        const loc = entity.location;
        if ('coordinates' in loc) {
          const coords = loc.coordinates as { lat: number; lon: number };
          node.metadata = { ...node.metadata, lat: coords.lat, lon: coords.lon };
        } else if ('source' in loc && 'featureId' in loc) {
          const src = sourceById.get(loc.source);
          if (!src) {
            throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown source "${loc.source}"`);
          }
          const feature = src.featureIndex.get(loc.featureId);
          if (!feature) {
            throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown featureId "${loc.featureId}" in source "${loc.source}"`);
          }
          const geom = feature.geometry as Record<string, unknown> | undefined;
          node.geometry = { type: String(geom?.type ?? ''), coordinates: geom?.coordinates };

          // Compute centroid from polygon geometry for lat/lon metadata
          let centroidLat: number | undefined;
          let centroidLon: number | undefined;
          if (geom) {
            const geomType = String(geom.type ?? '');
            const coords = geom.coordinates as unknown;
            let ring: number[][] | undefined;
            if (geomType === 'Polygon' && Array.isArray(coords) && coords.length > 0) {
              ring = (coords as unknown[][])[0] as number[][] | undefined;
            } else if (geomType === 'MultiPolygon' && Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0]) && (coords[0] as unknown[]).length > 0) {
              ring = ((coords as unknown[][])[0] as unknown[][])[0] as number[][] | undefined;
            }
            if (ring && ring.length > 0) {
              let sumLat = 0;
              let sumLon = 0;
              let count = 0;
              for (const pt of ring) {
                if (Array.isArray(pt) && pt.length >= 2) {
                  sumLon += Number(pt[0] ?? 0);
                  sumLat += Number(pt[1] ?? 0);
                  count++;
                }
              }
              if (count > 0) {
                centroidLat = sumLat / count;
                centroidLon = sumLon / count;
              }
            }
          }

          node.metadata = {
            ...node.metadata,
            source: loc.source,
            featureId: loc.featureId,
            sourceClass: src.source.class,
            lat: centroidLat,
            lon: centroidLon,
          };
        }

        semantics[nodeId] = node;
        nodes.push(node);
      }
    }
  }

  return { nodes, semantics };
}