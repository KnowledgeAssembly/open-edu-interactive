import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from './types.js';
import { rect } from './geometry.js';

interface Scale {
  min: number;
  max: number;
  step: number;
  direction: 'horizontal' | 'vertical';
}

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  for (const node of scene.nodes) {
    if (node.kind === 'number-line') {
      layoutNumberLineNode(node, ctx);
    }
  }
  return scene;
}

function layoutNumberLineNode(node: SceneNode, ctx: LayoutContext): void {
  const pad = 20;
  const axisX = pad;
  const axisWidth = ctx.width - pad * 2;
  const baselineY = Math.round(ctx.height / 2);

  const axis = node.children.find(c => c.role === 'axis');
  if (axis) {
    const scale = axis.metadata?.scale as Scale | undefined;
    if (scale) {
      const vertical = scale.direction === 'vertical';

      axis.bounds = vertical
        ? rect(axisX - 2, pad, 4, ctx.height - pad * 2)
        : rect(axisX, baselineY - 2, axisWidth, 4);

      const span = scale.max - scale.min || 1;
      const usable = vertical ? ctx.height - pad * 2 : axisWidth;

      for (const child of node.children) {
        if (child === axis || typeof child.value !== 'number') continue;
        if (child.value < scale.min || child.value > scale.max) continue;

        const t = (child.value - scale.min) / span;
        const pos = vertical ? pad + t * usable : axisX + t * usable;
        const cy = vertical ? pos : baselineY;
        const cx = vertical ? axisX : pos;

        switch (child.role) {
          case 'tick': {
            child.bounds = vertical
              ? rect(cx - 6, cy - 1, 12, 2)
              : rect(cx - 1, cy - 6, 2, 12);
            break;
          }
          case 'number': {
            const w = 28;
            const h = 18;
            child.bounds = vertical
              ? rect(cx + 12, cy - h / 2, w, h)
              : rect(cx - w / 2, cy + 14, w, h);
            break;
          }
          case 'marker': {
            const size = child.interactive ? Math.max(ctx.minTouchTarget, 16) : 14;
            child.bounds = rect(cx - size / 2, cy - size / 2, size, size);
            break;
          }
          default:
            break;
        }
      }
    }
  }
}
