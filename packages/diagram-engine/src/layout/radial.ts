import type { Bounds } from '../scene/types.js';
import { walkOrder } from './graph.js';

export function radialLayout(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
  ctx: { width: number; height: number; minTouchTarget: number },
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.min(ctx.width, ctx.height) / 2 - Math.max(ctx.minTouchTarget, 60);
  const nodeSize = Math.max(ctx.minTouchTarget, 60);

  const ordered = walkOrder(nodeIds, edges);
  const bounds = new Map<string, Bounds>();

  for (let i = 0; i < ordered.length; i++) {
    const angle = (2 * Math.PI * i) / n;
    const x = cx + radius * Math.cos(angle) - nodeSize / 2;
    const y = cy + radius * Math.sin(angle) - nodeSize / 2;
    bounds.set(ordered[i]!, {
      x: Math.round(x),
      y: Math.round(y),
      width: nodeSize,
      height: nodeSize,
    });
  }

  return bounds;
}