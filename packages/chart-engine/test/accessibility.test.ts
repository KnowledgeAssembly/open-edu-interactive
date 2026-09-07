import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import { validateAccessibility } from '../src/validation/accessibility.js';

const BAR_CONTENT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20 },
    { id: 'row-may', month: 'May', rainfall: 110 },
  ],
} as never;

const BAR_SPEC = {
  type: 'chart',
  version: '1.0.0',
  id: 'a11y-test',
  content: BAR_CONTENT,
  accessibility: { label: 'Bar chart' },
  sources: [{ class: 'authoritative' }],
} as never;

const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

describe('validateAccessibility (L4)', () => {
  it('passes for a labeled spec whose render has labeled interactive nodes and a non-empty tabular view', () => {
    const spec = BAR_SPEC as { accessibility?: { label: string } };
    const scene = buildScene(BAR_CONTENT);
    layout(scene, BAR_CONTENT, ctx);
    const rendered = svgFrom(scene, ctx, spec.accessibility?.label);
    const result = validateAccessibility(BAR_SPEC, rendered);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails with ACCESSIBILITY_ERROR when accessibility.label is missing', () => {
    const spec = { ...(BAR_SPEC as Record<string, unknown>), accessibility: undefined };
    const scene = buildScene(BAR_CONTENT);
    layout(scene, BAR_CONTENT, ctx);
    const rendered = svgFrom(scene, ctx);
    const result = validateAccessibility(spec as never, rendered);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'ACCESSIBILITY_ERROR' && i.level === 'L4')).toBe(true);
  });

  it('fails with ACCESSIBILITY_ERROR when the SVG carries literal colors', () => {
    const scene = buildScene(BAR_CONTENT);
    layout(scene, BAR_CONTENT, ctx);
    const rendered = svgFrom(scene, ctx, 'Bar chart');
    const colored = { ...rendered, svg: rendered.svg + '<rect fill="#ff0000"/>' };
    const result = validateAccessibility(BAR_SPEC, colored);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'ACCESSIBILITY_ERROR')).toBe(true);
  });
});