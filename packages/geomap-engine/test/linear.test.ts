import { describe, it, expect } from 'vitest';
import { GeoMapEngine } from '../src/engine.js';
import { buildScene } from '../src/scene/build.js';
import { deriveDisplay, emptyMaps } from '../src/scene/derive.js';
import type { GeoMapSpec, GeoMapContent } from '../src/schema.js';

const content: GeoMapContent = {
  projection: { type: 'equirectangular' },
  geography: {
    sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }],
  },
  entities: [
    { id: 'upstream', type: 'place', name: 'Upstream', location: { coordinates: { lat: 10, lon: 20 } } },
    { id: 'mid', type: 'place', name: 'Mid', location: { coordinates: { lat: 11, lon: 21 } } },
    { id: 'delta', type: 'place', name: 'Delta', location: { coordinates: { lat: 12, lon: 22 } } },
    { id: 'north', type: 'place', name: 'North', location: { coordinates: { lat: 14, lon: 20 } }, adjacentTo: ['south'] },
    { id: 'south', type: 'place', name: 'South', location: { coordinates: { lat: 8, lon: 20 } }, adjacentTo: ['north'] },
  ],
  layers: [
    { id: 'river', type: 'route', title: 'River', items: [{ id: 'main', path: ['upstream', 'mid', 'delta'], interactive: true }] },
    { id: 'places', type: 'marker', items: [{ entity: 'north', interactive: true }, { entity: 'south', interactive: true }] },
  ],
  legend: {
    visible: true,
    items: [
      { role: 'river', label: 'River route', linkedEntities: ['upstream', 'mid', 'delta'], interactive: true },
      { role: 'marker', label: 'Places' },
    ],
  },
};

const linearSpec: GeoMapSpec = {
  type: 'geomap',
  version: '1.0.0',
  id: 'linear',
  metadata: { title: 'Linear' },
  purpose: { learningObjective: 'Linear feature' },
  content,
  interaction: { mode: 'explore', actions: ['select', 'focus'] },
  questions: [],
  sources: [{ class: 'illustrative' }],
  accessibility: { label: 'Linear feature map' },
};

function makeHost() {
  const emitted: Array<{ name: string; data?: unknown }> = [];
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: (event: { name: string; data?: unknown }) => { emitted.push(event); },
    resolveAsset: (id: string) => id,
    get events() { return emitted; },
  };
}

describe('Phase 2 — linear-feature, adjacency, legend-link', () => {
  it('interactive route segments are indexed and selectable', () => {
    const scene = buildScene(content, (id: string) => id);
    const seg0 = scene.semantics['geom-river-main-seg-0'];
    expect(seg0).toBeDefined();
    expect(seg0!.interactive).toBe(true);
    expect(seg0!.acceptsActions).toContain('select');

    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(linearSpec as never, host, 'linear');
    instance.dispatch({ type: 'select', target: { id: 'geom-river-main-seg-0' } });
    const events = host.events;
    const selEvent = events.find((e) => e.name === 'geomap.entity-selected');
    expect(selEvent).toBeDefined();
    const data = selEvent!.data as { entityId: string; entityType: string; name: string; entityIndex: number };
    expect(data.entityId).toBe('upstream');
    expect(data.entityIndex).toBe(0);
    const snap = instance.snapshot() as unknown as { selection: string[] };
    expect(snap.selection).toContain('geom-river-main-seg-0');
  });

  it('alternative rows enumerate adjacentTo', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(linearSpec as never, host, 'linear');
    const snap = instance.snapshot() as unknown as { alternative: Array<{ entityId: string; adjacentTo?: string[] }> };
    const north = snap.alternative.find((r) => r.entityId === 'north');
    expect(north).toBeDefined();
    expect(north!.adjacentTo).toEqual(['south']);
    const south = snap.alternative.find((r) => r.entityId === 'south');
    expect(south!.adjacentTo).toEqual(['north']);
  });

  it('focus on legend item emits geomap.legend-linked and sets emphasis', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(linearSpec as never, host, 'linear');
    instance.dispatch({ type: 'focus', target: { id: 'geom-legend-item-0' } });
    const events = host.events;
    const evt = events.find((e) => e.name === 'geomap.legend-linked');
    expect(evt).toBeDefined();
    const data = evt!.data as { legendItemId: string; entityIds: string[] };
    expect(data.legendItemId).toBe('geom-legend-item-0');
    expect(data.entityIds.sort()).toEqual(['delta', 'mid', 'upstream'].sort());

    const snap = instance.snapshot() as unknown as { scene: { semantics: Record<string, { metadata?: Record<string, unknown> }> } };
    expect(snap.scene.semantics['geom-river-main-seg-0']!.metadata?.emphasis).toBe(true);
    expect(snap.scene.semantics['geom-river-main-seg-2']!.metadata?.emphasis).toBe(true);
  });

  it('deriveDisplay emphasis is pure and reset clears it', () => {
    const scene = buildScene(content, (id: string) => id);
    const base = structuredClone(scene);
    const maps = emptyMaps();
    maps.legendEntities = ['upstream', 'mid'];
    const display = deriveDisplay(maps, scene);
    expect(display.semantics['geom-river-main-seg-0']!.metadata?.emphasis).toBe(true);
    expect(display.semantics['geom-places-north']!.metadata?.emphasis).toBeUndefined();
    expect(scene.semantics['geom-river-main-seg-0']!.metadata?.emphasis).toBeUndefined();
    expect(JSON.stringify(base)).toBe(JSON.stringify(scene));
  });
});