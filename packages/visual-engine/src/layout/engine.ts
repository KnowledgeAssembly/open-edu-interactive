import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from './types.js';
import { rect } from './geometry.js';

interface Scale {
  min: number;
  max: number;
  step: number;
  direction: 'horizontal' | 'vertical';
}

function findAxis(group: SceneNode): { axis: SceneNode; scale: Scale } | null {
  for (const child of group.children) {
    if (child.role === 'axis') {
      const raw = child.metadata?.scale as Scale | undefined;
      if (raw && typeof raw.min === 'number' && typeof raw.max === 'number') {
        return { axis: child, scale: raw };
      }
    }
  }
  return null;
}

function layoutNumberLine(group: SceneNode, ctx: LayoutContext, axis: SceneNode, scale: Scale): void {
  const pad = 20;
  const axisX = pad;
  const axisWidth = ctx.width - pad * 2;
  const baselineY = Math.round(ctx.height / 2);
  const vertical = scale.direction === 'vertical';

  axis.bounds = vertical
    ? rect(axisX - 2, pad, 4, ctx.height - pad * 2)
    : rect(axisX, baselineY - 2, axisWidth, 4);

  const span = scale.max - scale.min || 1;
  const usable = vertical ? ctx.height - pad * 2 : axisWidth;

  for (const child of group.children) {
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

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  let cursor = 20;
  for (const node of scene.nodes) {
    layoutNode(node, ctx, cursor);
    cursor += 48;
  }
  return scene;
}

function layoutNode(node: SceneNode, ctx: LayoutContext, startX: number): void {
  if (node.role === 'group' && node.children.length > 0) {
    const axis = findAxis(node);
    if (axis) {
      layoutNumberLine(node, ctx, axis.axis, axis.scale);
      return;
    }
    let childCursor = startX;
    for (const child of node.children) {
      childCursor = layoutChild(child, ctx, childCursor);
    }
    return;
  }
  if (!node.bounds) {
    node.bounds = rect(startX, 20, 40, 24);
  }
}

function layoutChild(node: SceneNode, ctx: LayoutContext, startX: number): number {
  if (node.role === 'group' && node.children.length > 0) {
    layoutNode(node, ctx, startX);
    return startX + 48;
  }
  if (node.children.length > 0) {
    layoutNode(node, ctx, startX);
    let childCursor = startX;
    for (const child of node.children) {
      childCursor = layoutChild(child, ctx, childCursor);
    }
    return childCursor;
  }
  node.bounds = rect(startX, 20, 40, 24);
  return startX + 48;
}
