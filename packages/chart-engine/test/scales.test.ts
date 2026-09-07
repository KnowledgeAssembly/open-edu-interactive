import { describe, expect, it } from 'vitest';
import { linearScale, bandScale, niceTicks, barDomain, lineDomain } from '../src/layout/scales.js';

describe('linearScale', () => {
  it('maps domain [0,100] to range [0,500]', () => {
    const s = linearScale([0, 100], [0, 500]);
    expect(s(0)).toBe(0);
    expect(s(50)).toBe(250);
    expect(s(100)).toBe(500);
    expect(s.invert(250)).toBe(50);
  });
});

describe('bandScale', () => {
  it('maps categories to positions with bandwidth', () => {
    const s = bandScale(['a', 'b'], [0, 100]);
    expect(s('a')).toBe(5);
    expect(s('b')).toBeGreaterThanOrEqual(50);
    expect(s.bandwidth()).toBeGreaterThan(40);
  });
});

describe('niceTicks', () => {
  it('produces clean ticks for [0,110]', () => {
    const result = niceTicks(0, 110);
    expect(result.ticks.length).toBeGreaterThanOrEqual(4);
    expect(result.ticks.length).toBeLessThanOrEqual(8);
    expect(result.ticks[0]).toBe(0);
    expect(result.ticks[result.ticks.length - 1]).toBeGreaterThanOrEqual(110);
    expect(result.domain[0]).toBeLessThanOrEqual(0);
    expect(result.domain[1]).toBeGreaterThanOrEqual(110);
  });

  it('is byte-deterministic (two calls identical)', () => {
    const a = niceTicks(3, 97);
    const b = niceTicks(3, 97);
    expect(a.ticks).toEqual(b.ticks);
    expect(a.domain).toEqual(b.domain);
  });
});

describe('barDomain', () => {
  it('anchors at 0 for all-positive values', () => {
    const d = barDomain([10, 50, 100]);
    expect(d[0]).toBe(0);
    expect(d[1]).toBe(100);
  });
});

describe('lineDomain', () => {
  it('pads by 10%', () => {
    const d = lineDomain([10, 100]);
    expect(d[0]).toBeLessThan(10);
    expect(d[1]).toBeGreaterThan(100);
  });
});