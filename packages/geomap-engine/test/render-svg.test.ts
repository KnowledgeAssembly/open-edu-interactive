import { describe, it, expect } from 'vitest';
import { svgFrom } from '../src/render/svg.js';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import type { GeoMapContent } from '../src/schema.js';

function identityAsset(id: string): string { return id; }

const content: GeoMapContent = {
  projection: { type: 'equirectangular' },
  geography: {
    sources: [{ id: 'src', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
  },
  entities: [
    { id: 'bhubaneswar', type: 'city', name: 'Bhubaneswar', description: 'Capital of Odisha', location: { coordinates: { lat: 20.2961, lon: 85.8245 } } },
    { id: 'cuttack', type: 'city', name: 'Cuttack', location: { coordinates: { lat: 20.4625, lon: 85.8830 } } },
  ],
  layers: [
    { id: 'cities', type: 'marker', items: [{ entity: 'bhubaneswar', label: true, interactive: true }, { entity: 'cuttack', interactive: true }] },
  ],
};

describe('svgFrom', () => {
  it('returns valid SVG, a11y, interactive, and alternative', () => {
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('<title>GeoMap</title>');
    expect(result.a11y.length).toBe(2);
    expect(result.interactive.length).toBeGreaterThan(0);
    expect(result.alternative.length).toBe(2);
  });

  it('SVG has no onclick or script tags', () => {
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
  });

  it('a11y nodes have labels for every interactive entity', () => {
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    for (const a of result.a11y) {
      expect(a.label).toBeTruthy();
    }
  });

  it('alternative covers all entities', () => {
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.alternative.length).toBe(2);
    const entityIds = result.alternative.map((e) => e.entityId).sort();
    expect(entityIds).toEqual(['bhubaneswar', 'cuttack']);
  });

  it('determinism: two runs produce byte-identical SVG', () => {
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const r1 = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const r2 = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(r1.svg).toBe(r2.svg);
    expect(JSON.stringify(r1.a11y)).toBe(JSON.stringify(r2.a11y));
    expect(JSON.stringify(r1.alternative)).toBe(JSON.stringify(r2.alternative));
  });
});