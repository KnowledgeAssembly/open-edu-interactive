import type { Bounds } from '../scene/types.js';

export function gridLayout(
  nodeIds: string[],
  ctx: { width: number; height: number; minTouchTarget: number },
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const cellW = Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160));
  const cellH = Math.max(ctx.minTouchTarget, 60);
  const bounds = new Map<string, Bounds>();
  const startX = (ctx.width - cols * cellW) / 2;
  const rows = Math.ceil(n / cols);
  const startY = (ctx.height - rows * cellH) / 2;

  for (let i = 0; i < nodeIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    bounds.set(nodeIds[i]!, {
      x: Math.round(startX + col * cellW),
      y: Math.round(startY + row * cellH),
      width: Math.round(cellW * 0.85),
      height: Math.round(cellH * 0.75),
    });
  }

  return bounds;
}