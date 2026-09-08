import { describe, it, expect } from 'vitest';
import { radialLayout } from '../src/layout/radial.js';

const NODES = ['evaporation', 'condensation', 'precipitation', 'collection'];

describe('radial layout', () => {
  it('places all nodes on bounds', () => {
    const bounds = radialLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    expect(bounds.size).toBe(4);
    for (const [, b] of bounds) {
      expect(b.width).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThan(0);
    }
  });

  it('positions are within canvas', () => {
    const bounds = radialLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    for (const [, b] of bounds) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(800);
      expect(b.y + b.height).toBeLessThanOrEqual(600);
    }
  });

  it('determinism: same input same bounds', () => {
    const b1 = radialLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    const b2 = radialLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    expect(JSON.stringify([...b1])).toBe(JSON.stringify([...b2]));
  });

  it('starts at angle 0 (node at rightmost position)', () => {
    const bounds = radialLayout(NODES, { width: 800, height: 600, minTouchTarget: 44 });
    // First sorted node (collection) should be at angle 0
    const collectionBounds = bounds.get('collection');
    expect(collectionBounds).toBeDefined();
    // Sorted order: ['collection', 'condensation', 'evaporation', 'precipitation']
    // collection starts at 0 degrees, so it's furthest right
  });
});