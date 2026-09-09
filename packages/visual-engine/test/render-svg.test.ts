import { describe, expect, it } from 'vitest';
import { svgFrom } from '../src/render/svg.js';
import type { Scene } from '../src/scene/types.js';

describe('svgFrom', () => {
  it('produces valid SVG output', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'number-line-axis',
          role: 'axis',
          kind: 'line',
          children: [],
        },
        {
          id: 'number-line-tick-0',
          role: 'tick',
          kind: 'tick',
          value: 0,
          children: [],
        },
        {
          id: 'number-line-label-7',
          role: 'number',
          kind: 'text',
          value: 7,
          label: '7',
          children: [],
        },
        {
          id: 'number-line-marker-7',
          role: 'marker',
          kind: 'circle',
          value: 7,
          interactive: true,
          acceptsActions: ['select', 'focus'],
          children: [],
        },
      ],
      semantics: {},
    };

    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('data-oedu-role="marker"');
    expect(result.svg).toContain('data-oedu-value="7"');
    expect(result.svg).toContain('aria-label="7"');
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
  });

  it('is deterministic across two runs', () => {
    const scene: Scene = {
      nodes: [{ id: 'x', role: 'axis', kind: 'line', children: [] }],
      semantics: {},
    };
    const r1 = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const r2 = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(r1.svg).toBe(r2.svg);
  });

  it('produces a11y tree with interactive nodes', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'marker-7',
          role: 'marker',
          kind: 'circle',
          value: 7,
          interactive: true,
          acceptsActions: ['select'],
          children: [],
        },
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.a11y.length).toBeGreaterThan(0);
    expect(result.interactive).toContainEqual({ id: 'marker-7', action: 'select' });
  });

  it('renders wedge as path', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'fc',
          role: 'group',
          kind: 'fraction-circle',
          children: [
            {
              id: 'fc-sector-0', role: 'fraction-part', kind: 'wedge',
              children: [],
              metadata: { cx: 100, cy: 100, r: 50, startAngle: 0, endAngle: 90 },
            },
          ],
        },
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('<path');
    expect(result.svg).toContain('data-oedu-role="fraction-part"');
  });
});