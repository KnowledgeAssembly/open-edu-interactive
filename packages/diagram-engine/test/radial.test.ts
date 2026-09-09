import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
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

describe('layout edge geometry', () => {
  it('assigns edge geometry with endpoints inside canvas', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const root = laidOut.nodes.find(n => n.kind === 'diagram');
    const edges = root ? root.children.filter(n => n.kind === 'edge') : [];
    expect(edges.length).toBe(4);
    for (const edge of edges) {
      const geo = edge.metadata?.edgeGeometry as { points?: Array<{ x: number; y: number }> } | undefined;
      expect(geo).toBeDefined();
      expect(geo?.points).toBeDefined();
      for (const p of geo!.points!) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(ctx.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(ctx.height);
      }
    }
  });
});

describe('svgFrom edge rendering', () => {
  it('renders real edges with arrowhead and data-oedu-relationship', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx, 'Water Cycle', 'Test');
    expect(result.svg).toContain('marker-end="url(#arrowhead)"');
    expect(result.svg).toContain('data-oedu-relationship="leads-to"');
    expect(result.svg).not.toContain('<g>');
    const edgeCount = result.svg.split('data-oedu-relationship').length - 1;
    expect(edgeCount).toBe(4);
  });
});