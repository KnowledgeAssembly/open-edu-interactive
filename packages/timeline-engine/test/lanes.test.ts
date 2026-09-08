import { describe, expect, it } from 'vitest';
import { rect, union, translate, overlaps, contained } from '../src/layout/lanes.js';

describe('lanes geometry', () => {
  it('rect creates a rectangle', () => {
    const r = rect(10, 20, 100, 50);
    expect(r).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('union computes bounding box', () => {
    const r1 = rect(0, 0, 10, 10);
    const r2 = rect(5, 5, 10, 10);
    const u = union(r1, r2);
    expect(u).toEqual({ x: 0, y: 0, width: 15, height: 15 });
  });

  it('translate shifts', () => {
    const r = rect(10, 20, 30, 40);
    expect(translate(r, 5, 5)).toEqual({ x: 15, y: 25, width: 30, height: 40 });
  });

  it('overlaps detects intersection', () => {
    expect(overlaps(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
    expect(overlaps(rect(0, 0, 10, 10), rect(20, 20, 10, 10))).toBe(false);
  });

  it('contained checks containment', () => {
    expect(contained(rect(5, 5, 10, 10), rect(0, 0, 100, 100))).toBe(true);
    expect(contained(rect(-1, 0, 10, 10), rect(0, 0, 100, 100))).toBe(false);
  });
});