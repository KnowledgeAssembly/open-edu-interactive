import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from './types.js';
import { rect, type Rect } from './geometry.js';
import { horizontal as horizontalStrategy, center as centerStrategy, type Strategy } from './strategies.js';

const STRATEGIES: Record<string, Strategy> = {
  horizontal: horizontalStrategy,
  center: centerStrategy,
};

export function layout(scene: Scene, ctx: LayoutContext): Scene {
  const result = layoutNodes(scene.nodes, ctx, 20, 20);
  for (const [id, b] of result) {
    const node = scene.semantics[id];
    if (node && !node.bounds) {
      node.bounds = b;
    }
  }
  return scene;
}

function layoutNodes(
  nodes: SceneNode[],
  ctx: LayoutContext,
  sx: number,
  sy: number,
): Map<string, Rect> {
  const boundsMap = new Map<string, Rect>();
  const strategy = STRATEGIES.horizontal;
  if (!strategy) return boundsMap;

  const result = strategy(nodes, ctx, sx, sy);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    const b = result.bounds[i];
    if (b) {
      boundsMap.set(node.id, b);
      node.bounds = b;
    }
    if (node.children.length > 0) {
      const childResult = layoutNodes(
        node.children,
        ctx,
        b ? b.x : sx,
        b ? b.y + b.height + 8 : sy,
      );
      for (const [id, cb] of childResult) {
        boundsMap.set(id, cb);
      }
    }
  }

  return boundsMap;
}