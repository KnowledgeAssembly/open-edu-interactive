import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { GeoMapContent } from '../schema.js';
import type { LAYER_TYPES } from '../schema.js';

type Issue = ValidationResult['issues'][number];
type GeometryKind = 'point' | 'polygon' | 'line' | 'invalid';
type EntityKind = GeometryKind | 'unknown';

const ALLOWED_GEOMETRY_TYPES = ['Point', 'LineString', 'Polygon', 'MultiPolygon'];

function isFinitePair(p: unknown): p is [number, number] {
  if (!Array.isArray(p) || p.length < 2) return false;
  return (
    typeof p[0] === 'number' && Number.isFinite(p[0]) &&
    typeof p[1] === 'number' && Number.isFinite(p[1]) &&
    p[1] >= -90 && p[1] <= 90 &&
    p[0] >= -180 && p[0] <= 180
  );
}

function geometryKindOf(geom: { type?: unknown; coordinates?: unknown } | undefined | null): GeometryKind {
  if (!geom || typeof geom !== 'object') return 'invalid';
  const type = geom.type;
  const coords = geom.coordinates;
  if (type === 'Point') {
    return isFinitePair(coords) ? 'point' : 'invalid';
  }
  if (type === 'LineString') {
    return Array.isArray(coords) && coords.length >= 2 && coords.every(isFinitePair) ? 'line' : 'invalid';
  }
  if (type === 'Polygon') {
    if (!Array.isArray(coords) || coords.length < 1) return 'invalid';
    const ok = coords.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(isFinitePair));
    return ok ? 'polygon' : 'invalid';
  }
  if (type === 'MultiPolygon') {
    if (!Array.isArray(coords) || coords.length < 1) return 'invalid';
    const okPolygons = coords.every((poly) =>
      Array.isArray(poly) && poly.length >= 1 &&
      poly.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(isFinitePair)),
    );
    return okPolygons ? 'polygon' : 'invalid';
  }
  return 'invalid';
}

function propertiesArePrimitives(props: unknown): boolean {
  if (props === undefined || props === null) return true;
  if (typeof props === 'string') {
    return !/<script/i.test(props) && !/javascript:/i.test(props);
  }
  if (typeof props === 'number' || typeof props === 'boolean') return true;
  if (Array.isArray(props)) {
    return props.every((v) => propertiesArePrimitives(v));
  }
  if (typeof props === 'object') {
    return Object.values(props).every((v) => propertiesArePrimitives(v));
  }
  return false;
}

function pushIssue(
  issues: Issue[],
  level: Issue['level'],
  code: Issue['code'],
  message: string,
): void {
  issues.push({ level, code, message });
}

export function validateGeography(content: GeoMapContent, issues: Issue[]): void {
  const sources = content.geography?.sources ?? [];
  const entities = content.entities ?? [];
  const layers = content.layers ?? [];

  const featureIdsBySource = new Map<string, Set<string>>();
  const kindBySource = new Map<string, Map<string, GeometryKind>>();
  const uriSources = new Set<string>();

  for (const src of sources) {
    if (src.uri !== undefined && src.data === undefined) {
      uriSources.add(src.id);
      continue;
    }
    if (src.data === undefined) {
      pushIssue(issues, 'L2', 'INVALID_SPEC', `source "${src.id}" has neither data nor uri`);
      continue;
    }
    const data = src.data as Record<string, unknown>;
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      pushIssue(issues, 'L2', 'INVALID_ENTITY', `source "${src.id}" data is not a GeoJSON FeatureCollection`);
      continue;
    }
    const featureIds = new Set<string>();
    const kinds = new Map<string, GeometryKind>();
    for (const feature of data.features as unknown[]) {
      const f = feature as Record<string, unknown>;
      if (f.type !== 'Feature') {
        pushIssue(issues, 'L2', 'INVALID_ENTITY', `source "${src.id}" contains a non-Feature member`);
        continue;
      }
      const props = f.properties;
      if (!propertiesArePrimitives(props)) {
        pushIssue(issues, 'L2', 'INVALID_SPEC', `source "${src.id}" feature properties contain non-primitive or executable content`);
      }
      if (f.id !== undefined) {
        if (typeof f.id !== 'string' || f.id.length === 0) {
          pushIssue(issues, 'L2', 'INVALID_ENTITY', `source "${src.id}" feature id must be a non-empty string`);
        } else {
          featureIds.add(f.id);
        }
      }
      const geom = f.geometry as { type?: unknown; coordinates?: unknown } | undefined;
      const kind = geometryKindOf(geom);
      if (kind === 'invalid') {
        pushIssue(issues, 'L2', 'INVALID_ENTITY', `source "${src.id}" feature "${String(f.id ?? '')}" has structurally invalid geometry`);
      } else if (geom && !(ALLOWED_GEOMETRY_TYPES as readonly unknown[]).includes(geom.type as string)) {
        pushIssue(issues, 'L2', 'INVALID_ENTITY', `source "${src.id}" feature "${String(f.id ?? '')}" has unsupported geometry type "${String(geom.type)}"`);
      }
      if (typeof f.id === 'string') {
        kinds.set(f.id, kind);
      }
    }
    featureIdsBySource.set(src.id, featureIds);
    kindBySource.set(src.id, kinds);
  }

  const entityKind = new Map<string, EntityKind>();
  for (const entity of entities) {
    const loc = entity.location;
    if ('coordinates' in loc) {
      entityKind.set(entity.id, 'point');
      continue;
    }
    const srcId = loc.source as string;
    const featureId = loc.featureId as string;
    if (uriSources.has(srcId)) {
      entityKind.set(entity.id, 'unknown');
      continue;
    }
    const ids = featureIdsBySource.get(srcId);
    if (!ids) {
      pushIssue(issues, 'L2', 'INVALID_REFERENCE', `entity "${entity.id}" references unknown source "${srcId}"`);
      continue;
    }
    if (!ids.has(featureId)) {
      pushIssue(issues, 'L2', 'INVALID_REFERENCE', `entity "${entity.id}" references featureId "${featureId}" that is absent from source "${srcId}"`);
    }
    const kinds = kindBySource.get(srcId) ?? new Map<string, GeometryKind>();
    entityKind.set(entity.id, kinds.get(featureId) ?? 'invalid');
  }

  for (const layer of layers) {
    for (const item of layer.items) {
      const itemRecord = item as Record<string, unknown>;
      const layerType = layer.type as (typeof LAYER_TYPES)[number];
      if (layerType === 'route') {
        const path = itemRecord.path as string[] | undefined;
        if (!path) continue;
        for (const ref of path) {
          const kind = entityKind.get(ref);
          if (kind !== undefined && kind !== 'unknown' && kind !== 'point') {
            pushIssue(issues, 'L2', 'INVALID_ENTITY', `route layer "${layer.id}" path entity "${ref}" must be point-resolvable, got geometry kind "${kind}"`);
          }
        }
        continue;
      }
      const entityId = itemRecord.entity as string | undefined;
      if (!entityId) continue;
      const kind = entityKind.get(entityId);
      if (kind === undefined || kind === 'unknown') continue;
      if (layerType === 'region' && kind !== 'polygon') {
        pushIssue(issues, 'L2', 'INVALID_ENTITY', `region layer "${layer.id}" item "${entityId}" must bind to Polygon/MultiPolygon geometry, got "${kind}"`);
      }
      if ((layerType === 'marker' || layerType === 'label') && kind !== 'point') {
        pushIssue(issues, 'L2', 'INVALID_ENTITY', `${layerType} layer "${layer.id}" item "${entityId}" must bind to point geometry, got "${kind}"`);
      }
    }
  }
}