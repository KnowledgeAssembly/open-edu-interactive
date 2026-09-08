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

function centroidOf(geom: Record<string, unknown> | undefined): { lat: number; lon: number } | undefined {
  if (!geom) return undefined;
  const geomType = String(geom.type ?? '');
  const coords = geom.coordinates as unknown;
  let ring: number[][] | undefined;
  if (geomType === 'Point' && Array.isArray(coords) && coords.length >= 2) {
    return { lon: Number(coords[0] ?? 0), lat: Number(coords[1] ?? 0) };
  }
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
      return { lat: sumLat / count, lon: sumLon / count };
    }
  }
  return undefined;
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

  const resolvedPos = new Map<string, { lat: number; lon: number }>();
  const resolvedGeom = new Map<string, { type: string; coordinates: unknown }>();
  const resolvedClass = new Map<string, string>();

  for (const entity of entities) {
    const loc = entity.location;
    if ('coordinates' in loc) {
      resolvedPos.set(entity.id, { lat: loc.coordinates.lat, lon: loc.coordinates.lon });
      resolvedGeom.set(entity.id, { type: 'Point', coordinates: [loc.coordinates.lon, loc.coordinates.lat] });
      continue;
    }
    const src = sourceById.get(loc.source);
    if (!src) {
      throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown source "${loc.source}"`);
    }
    const feature = src.featureIndex.get(loc.featureId);
    if (!feature) {
      throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown featureId "${loc.featureId}" in source "${loc.source}"`);
    }
    const geom = feature.geometry as Record<string, unknown> | undefined;
    resolvedGeom.set(entity.id, { type: String(geom?.type ?? ''), coordinates: geom?.coordinates });
    resolvedClass.set(entity.id, src.source.class);
    const centroid = centroidOf(geom);
    if (centroid) {
      resolvedPos.set(entity.id, centroid);
    }
  }

  for (const layer of layers) {
    assertUnique(seen, layer.id);
    const layerHidden = layer.visible === false;

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
          const pos = resolvedPos.get(entity.id);
          const segNode: SceneNode = {
            id: segId,
            role: 'route-segment',
            kind: 'route-segment',
            label: entity.name,
            description: entity.description,
            interactive: false,
            hidden: layerHidden,
            metadata: {
              entityId: entity.id,
              entityType: entity.type,
              name: entity.name,
              entityIndex: i,
              location: entity.location,
              links: entity.links ?? undefined,
              lat: pos?.lat,
              lon: pos?.lon,
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
          hidden: layerHidden,
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

        const interactive = !layerHidden && itemRecord.interactive !== false;
        const isLabel = layer.type === 'label';
        const isMarker = layer.type === 'marker';

        const geometry = resolvedGeom.get(entity.id);
        const pos = resolvedPos.get(entity.id);

        const node: SceneNode = {
          id: nodeId,
          role: isLabel ? 'label' : isMarker ? 'marker' : 'region',
          kind: isLabel ? 'label' : isMarker ? 'marker' : 'region',
          label: entity.name,
          description: entity.description,
          interactive,
          acceptsActions: interactive ? ['select', 'focus'] : undefined,
          hidden: layerHidden,
          metadata: {
            entityId: entity.id,
            entityType: entity.type,
            name: entity.name,
            description: entity.description,
            location: entity.location,
            sourceClass: resolvedClass.get(entity.id),
            links: entity.links ?? undefined,
            lat: pos?.lat,
            lon: pos?.lon,
          },
          children: [],
        };

        if (geometry) {
          node.geometry = geometry;
        }

        semantics[nodeId] = node;
        nodes.push(node);
      }
    }
  }

  const legend = content.legend;
  if (legend && legend.visible !== false && legend.items && legend.items.length > 0) {
    const legendNodeId = 'geom-legend';
    assertUnique(seen, legendNodeId);
    const legendItems: SceneNode[] = legend.items.map((item, i) => {
      const itemId = `geom-legend-item-${i}`;
      assertUnique(seen, itemId);
      return {
        id: itemId,
        role: 'legend-item',
        kind: 'legend-item',
        label: item.label,
        metadata: { role: item.role },
        children: [],
      };
    });
    const legendNode: SceneNode = {
      id: legendNodeId,
      role: 'legend',
      kind: 'legend',
      label: 'Legend',
      children: legendItems,
    };
    semantics[legendNodeId] = legendNode;
    nodes.push(legendNode);
  }

  return { nodes, semantics };
}