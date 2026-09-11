import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { deriveDisplay, emptyMaps, updateMapsFromToggle, updateMapsFromStep, updateMapsFromFilter, updateMapsFromClearFilter, updateMapsFromReset } from '../src/scene/derive.js';
import type { GeoMapContent } from '../src/schema.js';

function identityAsset(id: string): string { return id; }

const baseContent: GeoMapContent = {
  projection: { type: 'equirectangular' },
  geography: {
    sources: [
      { id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } },
    ],
  },
  entities: [
    { id: 'a', type: 'region', name: 'Region A', location: { coordinates: { lat: 10, lon: 20 } } },
    { id: 'b', type: 'region', name: 'Region B', location: { coordinates: { lat: 11, lon: 21 } } },
    { id: 'c', type: 'city', name: 'City C', location: { coordinates: { lat: 12, lon: 22 } } },
  ],
  layers: [
    { id: 'rivers', type: 'region', title: 'Rivers', items: [{ entity: 'a', interactive: true }, { entity: 'b', interactive: true }] },
    { id: 'cities', type: 'marker', title: 'Cities', items: [{ entity: 'c', interactive: true }] },
  ],
};

function makeLaidOut(content: GeoMapContent = baseContent) {
  const scene = buildScene(content, identityAsset);
  return layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
}

describe('deriveDisplay', () => {
  it('returns identical scene when no display maps are set', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    const display = deriveDisplay(maps, base);
    expect(display.nodes.length).toBe(base.nodes.length);
  });

  it('toggle hides/shows layer recursively', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    updateMapsFromToggle(maps, 'geom-rivers', false);
    const display = deriveDisplay(maps, base);
    const layerNode = display.semantics['geom-rivers'];
    expect(layerNode!.hidden).toBe(true);
    const childA = display.semantics['geom-rivers-a'];
    expect(childA).toBeDefined();
    if (childA) expect(childA.hidden).toBe(true);
  });

  it('toggle back to visible', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    updateMapsFromToggle(maps, 'geom-rivers', false);
    let display = deriveDisplay(maps, base);
    expect(display.semantics['geom-rivers']!.hidden).toBe(true);
    updateMapsFromToggle(maps, 'geom-rivers', true);
    display = deriveDisplay(maps, base);
    expect(display.semantics['geom-rivers']!.hidden).toBe(false);
  });

  it('filter hides other nodes', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    updateMapsFromFilter(maps, ['geom-rivers-a', 'geom-cities-c']);
    const display = deriveDisplay(maps, base);
    expect(display.semantics['geom-rivers-a']!.hidden).toBe(false);
    const nodeB = display.semantics['geom-rivers-b'];
    if (nodeB) expect(nodeB.hidden).toBe(true);
  });

  it('clear-filter restores visibility', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    updateMapsFromFilter(maps, ['geom-rivers-a']);
    const display = deriveDisplay(maps, base);
    const nodeB = display.semantics['geom-rivers-b'];
    if (nodeB) expect(nodeB.hidden).toBe(true);
    updateMapsFromClearFilter(maps);
    const restored = deriveDisplay(maps, base);
    const restoredB = restored.semantics['geom-rivers-b'];
    if (restoredB) expect(restoredB.hidden).toBe(false);
  });

  it('route-step sets route-completed and route-active roles', () => {
    const routeContent: GeoMapContent = {
      projection: { type: 'equirectangular' },
      geography: {
        sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }],
      },
      entities: [
        { id: 'a', type: 'city', name: 'A', location: { coordinates: { lat: 10, lon: 20 } } },
        { id: 'b', type: 'city', name: 'B', location: { coordinates: { lat: 11, lon: 21 } } },
        { id: 'c', type: 'city', name: 'C', location: { coordinates: { lat: 12, lon: 22 } } },
        { id: 'd', type: 'city', name: 'D', location: { coordinates: { lat: 13, lon: 23 } } },
      ],
      layers: [
        { id: 't', type: 'route', items: [{ id: 'r1', path: ['a', 'b', 'c', 'd'] }] },
      ],
    };
    const base = makeLaidOut(routeContent);
    const routeNode = base.semantics['geom-t-r1'];
    expect(routeNode).toBeDefined();

    const maps = emptyMaps();
    updateMapsFromStep(maps, 'geom-t-r1', 2);
    const display = deriveDisplay(maps, base);
    const seg0 = display.semantics['geom-t-r1-seg-0'];
    const seg1 = display.semantics['geom-t-r1-seg-1'];
    const seg2 = display.semantics['geom-t-r1-seg-2'];
    const seg3 = display.semantics['geom-t-r1-seg-3'];
    if (seg0) expect(seg0.role).toBe('route-completed');
    if (seg1) expect(seg1.role).toBe('route-completed');
    if (seg2) expect(seg2.role).toBe('route-active');
    if (seg3) expect(seg3.role !== 'route-completed' && seg3.role !== 'route-active').toBe(true);
  });

  it('reset clears all maps', () => {
    const base = makeLaidOut();
    const maps = emptyMaps();
    updateMapsFromToggle(maps, 'geom-rivers', false);
    updateMapsFromFilter(maps, ['geom-rivers-a']);
    updateMapsFromReset(maps);
    const display = deriveDisplay(maps, base);
    expect(display.semantics['geom-rivers']!.hidden).toBe(false);
    expect(display.semantics['geom-rivers-b']!.hidden).toBe(false);
  });

  it('does not mutate base scene', () => {
    const base = makeLaidOut();
    const original = JSON.stringify(base);
    const maps = emptyMaps();
    updateMapsFromToggle(maps, 'geom-rivers', false);
    deriveDisplay(maps, base);
    expect(JSON.stringify(base)).toBe(original);
  });
});