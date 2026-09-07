import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';

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

describe('svgFrom (renderer)', () => {
  it('produces a well-formed SVG with title and desc', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);
    const result = svgFrom(scene, ctx, 'Test Chart', 'A test chart');

    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('<title>Test Chart</title>');
    expect(result.svg).toContain('<desc>A test chart</desc>');
    expect(result.svg).toContain('<g id="chart-root">');
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
  });

  it('interactive map lists bars with select and focus actions', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);
    const result = svgFrom(scene, ctx);

    expect(result.interactive.length).toBeGreaterThanOrEqual(2);
    for (const entry of result.interactive) {
      expect(['select', 'focus']).toContain(entry.action);
    }
  });

  it('tabular output lists all rows with values', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);
    const result = svgFrom(scene, ctx);

    expect(result.tabular.length).toBe(2);
    expect(result.tabular[0]!.rowLabel).toBe('Jan');
    expect(result.tabular[0]!.values[0]!.value).toBe(20);
    expect(result.tabular[1]!.rowLabel).toBe('May');
    expect(result.tabular[1]!.values[0]!.value).toBe(110);
  });

  it('deterministic: two runs produce identical SVG', () => {
    const sceneA = buildScene(BAR_INPUT);
    layout(sceneA, BAR_INPUT, ctx);
    const resultA = svgFrom(sceneA, ctx);

    const sceneB = buildScene(BAR_INPUT);
    layout(sceneB, BAR_INPUT, ctx);
    const resultB = svgFrom(sceneB, ctx);

    expect(resultA.svg).toBe(resultB.svg);
    expect(JSON.stringify(resultA.tabular)).toBe(JSON.stringify(resultB.tabular));
  });
});