import type { Scene, SceneNode, XY } from '../scene/types.js';
import type { ViewportSpec } from '../schema.js';
import { bboxOf, fitViewport, makeProjector } from './projection.js';
import { rect, union, type Rect } from './geometry.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

function ringVertices(geometry?: { type: string; coordinates: unknown }): Array<[number, number]> {
  if (!geometry) return [];
  const coords = geometry.coordinates as unknown;
  const type = geometry.type;
  if (type === 'Polygon' && Array.isArray(coords) && coords.length > 0) {
    const ring = coords[0] as unknown[];
    return ring.filter((p) => Array.isArray(p) && p.length >= 2) as Array<[number, number]>;
  }
  if (type === 'MultiPolygon' && Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
    const ring = (coords[0] as unknown[])[0] as unknown[];
    return ring.filter((p) => Array.isArray(p) && p.length >= 2) as Array<[number, number]>;
  }
  return [];
}

function expandToMin(r: Rect, min: number): Rect {
  const width = Math.max(min, r.width);
  const height = Math.max(min, r.height);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  return rect(cx - width / 2, cy - height / 2, width, height);
}

export function layout(scene: Scene, ctx: LayoutContext, viewport?: ViewportSpec): Scene {
  const allLons: number[] = [];
  const allLats: number[] = [];

  function collectDegrees(node: SceneNode): void {
    const meta = node.metadata;
    if (meta) {
      const lat = meta.lat as number | undefined;
      const lon = meta.lon as number | undefined;
      if (lat !== undefined && lon !== undefined) {
        allLons.push(lon);
        allLats.push(lat);
      }
    }
    for (const pt of ringVertices(node.geometry)) {
      allLons.push(pt[0]!);
      allLats.push(pt[1]!);
    }
    for (const child of node.children) {
      collectDegrees(child);
    }
  }

  for (const node of scene.nodes) {
    collectDegrees(node);
  }

  if (allLons.length === 0) {
    return scene;
  }

  const bbox = bboxOf(allLons, allLats);
  const padding = viewport?.padding ?? 0.08;
  const fitted = fitViewport(bbox, { width: ctx.width, height: ctx.height }, padding);
  const center = viewport?.center ?? { lat: fitted.cy, lon: fitted.cx };
  const scale =
    viewport?.zoom !== undefined ? fitted.scale * Math.pow(2, viewport.zoom / 10) : fitted.scale;

  const project = makeProjector('equirectangular', ctx.width, ctx.height, { center, scale });

  function projectPolygon(node: SceneNode): XY[] | undefined {
    const pts = ringVertices(node.geometry);
    if (pts.length === 0) return undefined;
    return pts.map(([lon, lat]) => project(lon, lat));
  }

  function assignBounds(node: SceneNode): void {
    const meta = node.metadata;
    const lat = meta?.lat as number | undefined;
    const lon = meta?.lon as number | undefined;

    if (node.kind === 'region') {
      const projected = projectPolygon(node);
      if (projected && projected.length > 0) {
        node.path = projected;
        const r = union(...projected.map((p) => rect(p.x, p.y, 0, 0)));
        node.bounds = expandToMin(r, node.interactive ? ctx.minTouchTarget : 8);
        return;
      }
    }

    if (lat !== undefined && lon !== undefined) {
      const pt = project(lon, lat);
      if (node.kind === 'marker') {
        const size = Math.max(8, ctx.minTouchTarget);
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
        return;
      }
      if (node.kind === 'label' || node.kind === 'route-segment') {
        const size = node.interactive ? ctx.minTouchTarget : 8;
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
        return;
      }
      node.bounds = rect(pt.x - 4, pt.y - 4, 8, 8);
      return;
    }

    if (node.kind === 'legend') {
      let width = 0;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]!;
        const label = child.label ?? String(i);
        width = Math.max(width, label.length * 7);
      }
      const x = 8;
      const y = 8;
      const legendWidth = Math.max(40, width + 16);
      node.bounds = rect(x, y, legendWidth, node.children.length * 18 + 10);
      for (let i = 0; i < node.children.length; i++) {
        node.children[i]!.bounds = rect(x + 8, y + 6 + i * 18, legendWidth - 16, 16);
      }
      return;
    }

    for (const child of node.children) {
      assignBounds(child);
    }
  }

  for (const node of scene.nodes) {
    assignBounds(node);
  }

  for (const node of scene.nodes) {
    if (node.kind === 'route') {
      const ordered = [...node.children]
        .sort((a, b) => Number(a.metadata?.entityIndex) - Number(b.metadata?.entityIndex))
        .filter((c) => c.bounds);
      if (ordered.length > 0) {
        node.points = ordered.map((c) => ({
          x: c.bounds!.x + c.bounds!.width / 2,
          y: c.bounds!.y + c.bounds!.height / 2,
        }));
        node.bounds = union(...ordered.map((c) => c.bounds!));
      }
    }
  }

  return scene;
}