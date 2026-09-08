import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import type { DiagramContent } from '../src/schema.js';

const WATER_CYCLE: DiagramContent = {
  kind: 'cycle',
  nodes: [
    { id: 'evaporation', label: 'Evaporation' },
    { id: 'condensation', label: 'Condensation' },
    { id: 'precipitation', label: 'Precipitation' },
    { id: 'collection', label: 'Collection' },
  ],
  edges: [
    { from: 'evaporation', to: 'condensation', relationship: 'leads-to' },
    { from: 'condensation', to: 'precipitation', relationship: 'leads-to' },
    { from: 'precipitation', to: 'collection', relationship: 'leads-to' },
    { from: 'collection', to: 'evaporation', relationship: 'leads-to' },
  ],
};

describe('layout engine', () => {
  it('assigns bounds and positionSource to all nodes', () => {
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' }, 'radial');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram');
    expect(root).toBeDefined();
    const nodeChildren = root!.children.filter((n) => n.kind === 'node');
    for (const n of nodeChildren) {
      expect(n.bounds).toBeDefined();
      expect((n as unknown as Record<string, unknown>).positionSource).toBe('illustrative');
    }
  });

  it('determinism: two runs byte-equal', () => {
    const scene = buildScene(WATER_CYCLE);
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const l1 = layout(scene, ctx, 'radial');
    const l2 = layout(scene, ctx, 'radial');
    expect(JSON.stringify(l1)).toBe(JSON.stringify(l2));
  });

  it('all node positions carry positionSource illustrative', () => {
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' }, 'hierarchical');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram');
    const nodeChildren = root!.children.filter((n) => n.kind === 'node');
    for (const n of nodeChildren) {
      expect((n as unknown as Record<string, unknown>).positionSource).toBe('illustrative');
    }
  });
});