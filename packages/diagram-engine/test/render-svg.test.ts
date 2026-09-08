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

describe('svgFrom', () => {
  it('produces deterministic SVG (two-run identical)', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const r1 = svgFrom(laidOut, ctx, 'Water Cycle', 'Test');
    const r2 = svgFrom(laidOut, ctx, 'Water Cycle', 'Test');
    expect(r1.svg).toBe(r2.svg);
  });

  it('has no onclick or script elements', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx, 'Water Cycle');
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
    expect(result.svg).not.toContain('javascript:');
  });

  it('a11y includes labels for every node and every edge', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx);
    // 4 nodes + 4 edges
    expect(result.a11y.length).toBeGreaterThanOrEqual(8);
    for (const a of result.a11y) {
      expect(a.label.length).toBeGreaterThan(0);
    }
  });

  it('alternative covers all nodes and edges', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx);
    const nodes = result.alternative.filter((r) => r.kind === 'node');
    const edges = result.alternative.filter((r) => r.kind === 'edge');
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(4);
    for (const e of edges) {
      expect(e.relationship).toBeDefined();
    }
  });

  it('alternative includes cycle members for cyclic graph', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx);
    const cycles = result.alternative.filter((r) => r.kind === 'cycle');
    expect(cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('interactive maps nodes to select/focus and edges to follow', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx);
    const nodeActionTypes = result.interactive.filter((i) => i.id.startsWith('node-')).map((i) => i.action);
    expect(nodeActionTypes).toContain('select');
    expect(nodeActionTypes).toContain('focus');
    const edgeActionTypes = result.interactive.filter((i) => i.id.startsWith('edge-')).map((i) => i.action);
    expect(edgeActionTypes).toContain('follow');
  });
});