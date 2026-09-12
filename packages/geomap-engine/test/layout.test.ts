import { describe, it, expect } from 'vitest';
import { layout } from '../src/layout/engine.js';
import { buildScene } from '../src/scene/build.js';
import { validateLayout } from '../src/validation/layout.js';
import { rect, union, contained, polygonCentroid, pointInPolygon, polygonArea, polygonsOverlap, regionsOverlap } from '../src/layout/geometry.js';
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
    const marker = laidOut.semantics['geom-cities-bhubaneswar'];
    expect(marker!.bounds).toBeDefined();
    expect(marker!.bounds!.width).toBeGreaterThan(0);
  });

  it('determinism: two identical calls give identical bounds', () => {
    const scene1 = buildScene(odishaContent, identityAsset);
    const scene2 = buildScene(odishaContent, identityAsset);
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const laid1 = layout(scene1, ctx);
    const laid2 = layout(scene2, ctx);
    const marker1 = laid1.semantics['geom-cities-bhubaneswar'];
    const marker2 = laid2.semantics['geom-cities-bhubaneswar'];
    expect(JSON.stringify(marker1!.bounds)).toBe(JSON.stringify(marker2!.bounds));
  });

  it('multipolygon region: keeps all outer rings and bounds cover them', () => {
    const mpContent: GeoMapContent = {
      projection: { type: 'equirectangular' },
      geography: {
        sources: [{
          id: 'src',
          type: 'geojson',
          class: 'illustrative',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: 'split',
              geometry: {
                type: 'MultiPolygon',
                coordinates: [
                  [[[82, 18], [84, 18], [84, 20], [82, 20], [82, 18]]],
                  [[[86, 22], [88, 22], [88, 24], [86, 24], [86, 22]]],
                ],
              },
              properties: {},
            }],
          },
        }],
      },
      entities: [
        { id: 'split', type: 'region', name: 'Split', location: { source: 'src', featureId: 'split' } },
      ],
      layers: [{ id: 'states', type: 'region', items: [{ entity: 'split' }] }],
    };
    const scene = buildScene(mpContent, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const region = laidOut.semantics['geom-states-split'];
    expect(region!.rings).toHaveLength(2);
    expect(region!.path).toBe(region!.rings![0]);
    const farWest = region!.rings![0]![0]!.x;
    const farEast = region!.rings![1]![0]!.x;
    expect(region!.bounds!.width).toBeGreaterThan(farEast - farWest);
    const result = validateLayout(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.valid).toBe(true);
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

  it('polygonsOverlap returns false for adjacent (border-touching) polygons', () => {
    const a = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const b = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }];
    expect(polygonsOverlap(a, b)).toBe(false);
  });

  it('polygonsOverlap returns true for crossing polygons', () => {
    const a = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const b = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 5, y: 15 }];
    expect(polygonsOverlap(a, b)).toBe(true);
  });

  it('polygonsOverlap returns true when one polygon contains another', () => {
    const a = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const b = [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7 }];
    expect(polygonsOverlap(a, b)).toBe(true);
  });

  it('regionsOverlap checks all ring pairs across multipolygons', () => {
    const a = [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]];
    const b = [
      [{ x: 30, y: 30 }, { x: 40, y: 30 }, { x: 40, y: 40 }, { x: 30, y: 40 }],
      [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 5, y: 15 }],
    ];
    expect(regionsOverlap(a, b)).toBe(true);
  });

  it('polygonArea measures the ring area', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(polygonArea(square)).toBe(100);
  });
});