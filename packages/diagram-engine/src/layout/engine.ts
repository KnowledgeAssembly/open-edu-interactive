import type { Scene } from '../scene/types.js';
import { adjacency, kahnTopoSort } from './graph.js';
import { assignLayers, computeHierarchicalBounds } from './hierarchical.js';
import { radialLayout } from './radial.js';
import { gridLayout } from './grid.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

interface BoundsWithPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function layout(scene: Scene, ctx: LayoutContext, layoutType?: string): Scene {
  const root = scene.nodes.find((n) => n.kind === 'diagram');
  if (!root) return scene;

  const nodeChildren = root.children.filter((n) => n.kind === 'node');
  const edgeChildren = root.children.filter((n) => n.kind === 'edge');

  const nodeIds = nodeChildren.map((n) => n.metadata?.nodeId as string ?? n.id);

  const edgePairs = edgeChildren.map((e) => ({
    from: e.metadata?.fromNodeId as string,
    to: e.metadata?.toNodeId as string,
  }));

  const graph = adjacency(nodeIds, edgePairs);
  const topoSort = kahnTopoSort(graph);

  // Determine layout strategy
  const strategy = layoutType ?? 'hierarchical';
  let nodeBounds: Map<string, BoundsWithPos>;

  if (strategy === 'radial') {
    const radialBounds = radialLayout(nodeIds, ctx);
    nodeBounds = new Map<string, BoundsWithPos>();
    for (const [id, b] of radialBounds) {
      nodeBounds.set(id, b as unknown as BoundsWithPos);
    }
  } else if (strategy === 'grid') {
    const gridBounds = gridLayout(nodeIds, ctx);
    nodeBounds = new Map<string, BoundsWithPos>();
    for (const [id, b] of gridBounds) {
      nodeBounds.set(id, b as unknown as BoundsWithPos);
    }
  } else {
    // hierarchical
    if (topoSort) {
      const layerOf = assignLayers(nodeIds, edgePairs, topoSort);
      const sizeMap = new Map<string, { width: number; height: number }>();
      for (const id of nodeIds) {
        sizeMap.set(id, { width: 100, height: 50 });
      }
      nodeBounds = computeHierarchicalBounds(layerOf, sizeMap, ctx);
    } else {
      const gridBounds = gridLayout(nodeIds, ctx);
      nodeBounds = new Map<string, BoundsWithPos>();
      for (const [id, b] of gridBounds) {
        nodeBounds.set(id, b as unknown as BoundsWithPos);
      }
    }
  }

  const newRootChildren = root.children.map((c) => {
    const nid = c.metadata?.nodeId as string | undefined;
    if (c.kind === 'node' && nid) {
      const b = nodeBounds.get(nid);
      if (b) {
        return { ...c, bounds: { x: b.x, y: b.y, width: b.width, height: b.height }, positionSource: 'illustrative' as const };
      }
    }
    return c;
  });

  return {
    ...scene,
    nodes: scene.nodes.map((n) => {
      if (n.id === 'diagram-root') {
        return { ...n, children: newRootChildren };
      }
      return n;
    }),
  };
}