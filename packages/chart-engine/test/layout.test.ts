import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';

const BAR_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20 },
    { id: 'row-may', month: 'May', rainfall: 110 },
  ],
} as never;

const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

describe('layout engine', () => {
  it('places bars with monotonic positions and baseline at y=0', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);

    const bars = scene.nodes.filter((n) => n.kind === 'bar');
    expect(bars.length).toBe(2);

    for (const bar of bars) {
      expect(bar.bounds).toBeDefined();
      expect(bar.bounds!.width).toBeGreaterThanOrEqual(10);
      expect(bar.bounds!.height).toBeGreaterThan(0);
    }
  });

  it('deterministic: same input produces same bounds', () => {
    const sceneA = buildScene(BAR_INPUT);
    layout(sceneA, BAR_INPUT, ctx);
    const boundsA = sceneA.nodes
      .filter((n) => n.kind === 'bar')
      .map((n) => n.bounds);

    const sceneB = buildScene(BAR_INPUT);
    layout(sceneB, BAR_INPUT, ctx);
    const boundsB = sceneB.nodes
      .filter((n) => n.kind === 'bar')
      .map((n) => n.bounds);

    expect(JSON.stringify(boundsA)).toBe(JSON.stringify(boundsB));
  });
});