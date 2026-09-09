import { describe, expect, it } from 'vitest';
import { layout } from '../src/layout/engine.js';
import { contained, rect, overlaps, translate, union } from '../src/layout/geometry.js';
import type { Scene } from '../src/scene/types.js';

describe('geometry helpers', () => {
  it('contained returns true when fully inside', () => {
    expect(contained(rect(10, 10, 50, 50), rect(0, 0, 100, 100))).toBe(true);
  });

  it('contained returns false when partially outside', () => {
    expect(contained(rect(80, 80, 50, 50), rect(0, 0, 100, 100))).toBe(false);
  });

  it('overlaps detects intersection', () => {
    expect(overlaps(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
  });

  it('overlaps returns false for separated rects', () => {
    expect(overlaps(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBe(false);
  });

  it('union combines multiple rects', () => {
    const u = union([rect(0, 0, 10, 10), rect(20, 20, 10, 10)]);
    expect(u.x).toBe(0);
    expect(u.y).toBe(0);
    expect(u.width).toBe(30);
    expect(u.height).toBe(30);
  });

  it('translate shifts a rect', () => {
    const t = translate(rect(10, 10, 50, 50), 5, 10);
    expect(t).toEqual({ x: 15, y: 20, width: 50, height: 50 });
  });
});

describe('layout', () => {
  it('is deterministic: identical input yields identical bounds', () => {
    const scene1: Scene = {
      nodes: [
        { id: 'a', role: 'number', kind: 'text', value: 7, children: [] },
        { id: 'b', role: 'number', kind: 'text', value: 8, children: [] },
      ],
      semantics: {},
    };
    const scene2: Scene = {
      nodes: [
        { id: 'a', role: 'number', kind: 'text', value: 7, children: [] },
        { id: 'b', role: 'number', kind: 'text', value: 8, children: [] },
      ],
      semantics: {},
    };

    const laid1 = layout(scene1, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const laid2 = layout(scene2, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });

    expect(laid1.nodes[0]!.bounds).toEqual(laid2.nodes[0]!.bounds);
    expect(laid1.nodes[1]!.bounds).toEqual(laid2.nodes[1]!.bounds);
  });

  it('assigns monotonic x positions for a horizontal number-line', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'nl',
          role: 'group',
          kind: 'number-line',
          children: [
            { id: 'nl-axis', role: 'axis', kind: 'line', metadata: { scale: { min: 0, max: 2, step: 1, direction: 'horizontal' } }, children: [] },
            { id: 'nl-tick-0', role: 'tick', kind: 'tick', value: 0, children: [] },
            { id: 'nl-tick-1', role: 'tick', kind: 'tick', value: 1, children: [] },
            { id: 'nl-tick-2', role: 'tick', kind: 'tick', value: 2, children: [] },
          ],
        },
      ],
      semantics: {},
    };
    const laid = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const ticks = laid.nodes[0]!.children.filter((n) => n.role === 'tick');
    const xs = ticks.map((n) => n.bounds?.x ?? 0);
    expect(xs[0]!).toBeLessThan(xs[1]!);
    expect(xs[1]!).toBeLessThan(xs[2]!);
  });
});