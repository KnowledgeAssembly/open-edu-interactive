import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { validateLayout } from '../src/validation/layout.js';

const BAR_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20 },
    { id: 'row-may', month: 'May', rainfall: 110 },
  ],
} as never;

const TINY_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative' }],
  data: [
    { id: 'r1', month: 'Jan', rainfall: 1 },
    { id: 'r2', month: 'Feb', rainfall: 2 },
    { id: 'r3', month: 'Mar', rainfall: 3 },
    { id: 'r4', month: 'Apr', rainfall: 4 },
  ],
} as never;

describe('validateLayout (L3)', () => {
  it('passes for a bar scene at the default canvas', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = validateLayout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails with ACCESSIBILITY_ERROR when interactive bars are smaller than minTouchTarget in both dimensions', () => {
    const tinyCtx = { width: 120, height: 120, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(TINY_INPUT);
    layout(scene, TINY_INPUT, tinyCtx);
    const result = validateLayout(scene, tinyCtx);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'ACCESSIBILITY_ERROR' && i.level === 'L3')).toBe(true);
  });
});