import { describe, it, expect } from 'vitest';
import { layout } from '../src/layout/engine.js';
import { buildScene } from '../src/scene/build.js';
import { rect, union, contained, polygonCentroid, pointInPolygon } from '../src/layout/geometry.js';
import type { GeoMapContent } from '../src/schema.js';

function identityAsset(id: string): string { return id; }

const odishaContent: GeoMapContent = {
  projection: { type: 'equirectangular' },
  geography: {
    sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }],
  },
  entities: [
    { id: 'bhubaneswar', type: 'city', name: 'Bhubaneswar', location: { coordinates: { lat: 20.2961, lon: 85.8245 } } },
  ],
  layers: [
    { id: 'cities', type: 'marker', items: [{ entity: 'bhubaneswar', label: true }] },
  ],
};

describe('layout', () => {
  it('assigns bounds to nodes', () => {
    const scene = buildScene(odishaContent, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    for (const node of laidOut.nodes) {
      if (node.kind === 'marker') {
        expect(node.bounds).toBeDefined();
      }
    }
    const marker = laidOut.nodes.find((n) => n.role === 'marker');
    expect(marker!.bounds).toBeDefined();
    expect(marker!.bounds!.width).toBeGreaterThan(0);
  });

  it('determinism: two identical calls give identical bounds', () => {
    const scene1 = buildScene(odishaContent, identityAsset);
    const scene2 = buildScene(odishaContent, identityAsset);
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const laid1 = layout(scene1, ctx);
    const laid2 = layout(scene2, ctx);
    expect(JSON.stringify(laid1.nodes[0]!.bounds)).toBe(JSON.stringify(laid2.nodes[0]!.bounds));
  });
});

describe('geometry', () => {
  it('rect creates correct structure', () => {
    const r = rect(10, 20, 100, 50);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(100);
    expect(r.height).toBe(50);
  });

  it('union computes bounding box', () => {
    const u = union(rect(0, 0, 10, 10), rect(5, 5, 15, 15));
    expect(u.x).toBe(0);
    expect(u.y).toBe(0);
    expect(u.width).toBe(20);
    expect(u.height).toBe(20);
  });

  it('contained checks correctly', () => {
    expect(contained(rect(5, 5, 10, 10), rect(0, 0, 100, 100))).toBe(true);
    expect(contained(rect(-1, 5, 10, 10), rect(0, 0, 100, 100))).toBe(false);
  });

  it('polygonCentroid averages vertices', () => {
    const c = polygonCentroid([[0, 0], [10, 0], [10, 10], [0, 10]]);
    expect(c.x).toBe(5);
    expect(c.y).toBe(5);
  });

  it('pointInPolygon works for a simple square', () => {
    const poly = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(pointInPolygon({ x: 5, y: 5 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, poly)).toBe(false);
  });
});