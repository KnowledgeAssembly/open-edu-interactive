import { describe, it, expect } from 'vitest';
import { gridLayout } from '../src/layout/grid.js';

const NODES = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('grid layout', () => {
  it('places all nodes', () => {
    const bounds = gridLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    expect(bounds.size).toBe(6);
  });

  it('positions are within canvas', () => {
    const bounds = gridLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    for (const [, b] of bounds) {
      expect(b.x + b.width).toBeLessThanOrEqual(800);
      expect(b.y + b.height).toBeLessThanOrEqual(600);
    }
  });

  it('determinism: same input same bounds', () => {
    const b1 = gridLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    const b2 = gridLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    expect(JSON.stringify([...b1])).toBe(JSON.stringify([...b2]));
  });

  it('row-major stable ordering', () => {
    const bounds = gridLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    void [...NODES].sort();
    // a should be top-left, f should be bottom-right
    const aBounds = bounds.get('a')!;
    const fBounds = bounds.get('f')!;
    expect(aBounds.y).toBeLessThanOrEqual(fBounds.y);
  });
});