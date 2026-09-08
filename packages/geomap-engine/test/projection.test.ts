import { describe, it, expect } from 'vitest';
import { makeProjector, bboxOf, fitViewport } from '../src/layout/projection.js';

describe('projection', () => {
  it('makeProjector(equirectangular)(0,0) is canvas center', () => {
    const proj = makeProjector('equirectangular', 800, 600);
    const pt = proj(0, 0);
    expect(pt.x).toBe(400);
    expect(pt.y).toBe(300);
  });

  it('(lon, 0) moves east linearly', () => {
    const proj = makeProjector('equirectangular', 800, 600);
    const p0 = proj(0, 0);
    const p1 = proj(10, 0);
    expect(p1.x).toBeGreaterThan(p0.x);
    expect(p1.y).toBe(p0.y);
    const scale = Math.min(800, 600) / (2 * Math.PI);
    const lonRad = (10 * Math.PI) / 180;
    expect(p1.x - p0.x).toBeCloseTo(lonRad * scale);
  });

  it('(0, lat) moves south linearly', () => {
    const proj = makeProjector('equirectangular', 800, 600);
    const p0 = proj(0, 0);
    const p1 = proj(0, 10);
    expect(p1.y).toBeLessThan(p0.y);
  });
});

describe('bboxOf', () => {
  it('computes correct bounding box from coords', () => {
    const bbox = bboxOf([80, 90], [20, 25]);
    expect(bbox.west).toBe(80);
    expect(bbox.east).toBe(90);
    expect(bbox.south).toBe(20);
    expect(bbox.north).toBe(25);
  });
});

describe('fitViewport', () => {
  it('returns positive scale for a given bbox', () => {
    const result = fitViewport({ west: 80, south: 18, east: 88, north: 22 }, { width: 800, height: 600 }, 0.08);
    expect(result.scale).toBeGreaterThan(0);
    expect(result.cx).toBe(84);
    expect(result.cy).toBe(20);
  });

  it('determinism: identical input gives identical output', () => {
    const bbox = { west: 80, south: 18, east: 88, north: 22 };
    const canvas = { width: 800, height: 600 };
    const r1 = fitViewport(bbox, canvas, 0.08);
    const r2 = fitViewport(bbox, canvas, 0.08);
    expect(r1).toEqual(r2);
  });
});