import type { Scene, SceneNode } from '../scene/types.js';
import { bboxOf, fitViewport } from './projection.js';
import { rect } from './geometry.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  const allLons: number[] = [];
  const allLats: number[] = [];

  function collectCoords(node: SceneNode): void {
    const meta = node.metadata;
    if (meta) {
      const lat = meta.lat as number | undefined;
      const lon = meta.lon as number | undefined;
      if (lat !== undefined && lon !== undefined) {
        allLons.push(lon);
        allLats.push(lat);
      }
    }
    for (const child of node.children) {
      collectCoords(child);
    }
  }

  for (const node of scene.nodes) {
    collectCoords(node);
  }

  if (allLons.length === 0) {
    return scene;
  }

  const bbox = bboxOf(allLons, allLats);
  const fitted = fitViewport(bbox, { width: ctx.width, height: ctx.height }, 0.08);
  // Build adjusted scale that fits the viewport
  const adjustedScale = fitted.scale;

  // Adjust the projector by overriding the translate/scale
  const centerLon = fitted.cx;
  const centerLat = fitted.cy;

  function adjustedProject(lon: number, lat: number): { x: number; y: number } {
    const dx = ((lon - centerLon) * Math.PI) / 180;
    const dy = ((lat - centerLat) * Math.PI) / 180;
    const x = ctx.width / 2 + dx * adjustedScale;
    const y = ctx.height / 2 - dy * adjustedScale;
    return { x, y };
  }

  function assignBounds(node: SceneNode): void {
    const meta = node.metadata;
    const lat = meta?.lat as number | undefined;
    const lon = meta?.lon as number | undefined;

    if (lat !== undefined && lon !== undefined) {
      const pt = adjustedProject(lon, lat);
      if (node.role === 'marker' || node.kind === 'marker') {
        const size = Math.max(12, ctx.minTouchTarget);
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
      } else if (node.role === 'region' || node.kind === 'region') {
        const size = Math.max(60, ctx.minTouchTarget);
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
      } else {
        node.bounds = rect(pt.x - 4, pt.y - 4, 8, 8);
      }
    }

    for (const child of node.children) {
      assignBounds(child);
    }
  }

  for (const node of scene.nodes) {
    assignBounds(node);
  }

  return scene;
}