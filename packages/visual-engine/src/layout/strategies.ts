import { rect, type Rect, union } from './geometry.js';
import type { SceneNode } from '../scene/types.js';
import type { LayoutContext } from './types.js';

export type Strategy = (children: SceneNode[], ctx: LayoutContext, startX: number, startY: number) => { bounds: Rect[] };

export const absolute: Strategy = (children, _ctx, _sx, _sy) => {
  return {
    bounds: children.map((child) => {
      const g = child.geometry;
      if (g && typeof g.x === 'number' && typeof g.y === 'number') {
        return rect(g.x as number, g.y as number, (g.width as number) ?? 40, (g.height as number) ?? 40);
      }
      return rect(0, 0, 40, 40);
    }),
  };
};

export const horizontal: Strategy = (children, ctx, startX, startY) => {
  const gap = ctx.textStyle === 'compact' ? 4 : 8;
  let x = startX;
  const bounds: Rect[] = [];
  for (const child of children) {
    const w = 40;
    const h = 24;
    bounds.push(rect(x, startY, w, h));
    x += w + gap;
  }
  return { bounds };
};

export const vertical: Strategy = (children, ctx, startX, startY) => {
  const gap = ctx.textStyle === 'compact' ? 4 : 8;
  let y = startY;
  const bounds: Rect[] = [];
  for (const child of children) {
    const w = 80;
    const h = 20;
    bounds.push(rect(startX, y, w, h));
    y += h + gap;
  }
  return { bounds };
};

export const center: Strategy = (children, ctx, startX, startY) => {
  const childBounds = horizontal(children, ctx, startX, startY).bounds;
  if (childBounds.length === 0) return { bounds: [] };
  const u = union(childBounds);
  const cx = (ctx.width - u.width) / 2;
  const cy = (ctx.height - u.height) / 2;
  const dx = cx - u.x;
  const dy = cy - u.y;
  return { bounds: childBounds.map((b) => rect(b.x + dx, b.y + dy, b.width, b.height)) };
};

export const radial: Strategy = (_children, _ctx, _sx, _sy) => {
  return { bounds: [] };
};