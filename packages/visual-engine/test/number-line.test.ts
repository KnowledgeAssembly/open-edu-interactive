import { describe, expect, it } from 'vitest';
import { createNumberLine } from '../src/components/number-line.js';

describe('numberLine component', () => {
  it('creates correct number of ticks for 0-10 step 1', () => {
    const nodes = createNumberLine({ min: 0, max: 10, step: 1 }, 'nl');
    const ticks = nodes.filter((n) => n.role === 'tick');
    expect(ticks.length).toBe(11); // 0..10 inclusive
    expect(ticks[0]!.value).toBe(0);
    expect(ticks[10]!.value).toBe(10);
  });

  it('creates labels for each tick by default', () => {
    const nodes = createNumberLine({ min: 0, max: 3, step: 1 }, 'nl');
    const labels = nodes.filter((n) => n.role === 'number');
    expect(labels.length).toBe(4);
    expect(labels[0]!.label).toBe('0');
    expect(labels[3]!.label).toBe('3');
  });

  it('creates selectable markers for highlights', () => {
    const nodes = createNumberLine({ min: 0, max: 10, step: 1, highlight: [3, 7] }, 'nl');
    const markers = nodes.filter((n) => n.role === 'marker');
    expect(markers.length).toBe(2);
    expect(markers[0]!.value).toBe(3);
    expect(markers[0]!.interactive).toBe(true);
    expect(markers[0]!.acceptsActions).toContain('select');
    expect(markers[1]!.value).toBe(7);
  });

  it('throws on invalid range', () => {
    expect(() => createNumberLine({ min: 10, max: 0, step: 1 }, 'nl')).toThrow();
  });

  it('throws on non-positive step', () => {
    expect(() => createNumberLine({ min: 0, max: 10, step: 0 }, 'nl')).toThrow();
  });

  it('uses deterministic ids', () => {
    const a = createNumberLine({ min: 0, max: 2, step: 1 }, 'nl');
    const b = createNumberLine({ min: 0, max: 2, step: 1 }, 'nl');
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });
});