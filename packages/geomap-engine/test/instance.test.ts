import { describe, it, expect } from 'vitest';
import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import { GeoMapEngine } from '../src/engine.js';
import type { GeoMapSpec } from '../src/schema.js';

const validSpec: GeoMapSpec = {
  type: 'geomap',
  version: '1.0.0',
  id: 'test-map',
  metadata: { title: 'Test' },
  purpose: { learningObjective: 'Test' },
  content: {
    projection: { type: 'equirectangular' },
    geography: {
      sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }],
    },
    entities: [
      { id: 'pt', type: 'city', name: 'Point', location: { coordinates: { lat: 20, lon: 85 } } },
    ],
    layers: [
      { id: 'markers', type: 'marker', items: [{ entity: 'pt', interactive: true }] },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'focus'] },
  questions: [],
  sources: [{ class: 'illustrative' }],
  accessibility: { label: 'Test map' },
};

function makeHost() {
  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: (event: { seq: number; name: string; action?: unknown }) => { emitted.push(event); },
    resolveAsset: (id: string) => id,
    get events() { return emitted; },
  };
}

describe('GeoMapEngine', () => {
  it('can be registered and retrieved from the registry', () => {
    const registry = new EngineRegistry();
    const engine = new GeoMapEngine();
    registry.register(engine);
    const retrieved = registry.get('geomap');
    expect(retrieved).toBe(engine);
  });

  it('validate returns valid for a correct spec', () => {
    const engine = new GeoMapEngine();
    const result = engine.validate(validSpec as never);
    expect(result.valid).toBe(true);
  });

  it('validate returns invalid for unsupported projection', () => {
    const engine = new GeoMapEngine();
    const badSpec = {
      ...validSpec,
      content: { ...validSpec.content!, projection: { type: 'orthographic' as 'equirectangular' } },
    };
    const result = engine.validate(badSpec as never);
    expect(result.valid).toBe(false);
  });

  it('instantiate validates and throws INVALID_SPEC on failure', () => {
    const engine = new GeoMapEngine();
    const badSpec = {
      ...validSpec,
      content: { ...validSpec.content!, projection: { type: 'orthographic' as 'equirectangular' } },
    };
    const host = makeHost();
    try {
      engine.instantiate(badSpec as never, host);
      expect.unreachable('should have thrown');
    } catch (e) {
      const err = e as { code: string };
      expect(err.code).toBe('INVALID_SPEC');
    }
  });

  it('instantiate creates a running instance', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(validSpec as never, host, 'test-id');
    expect(instance.id).toBe('test-id');
    expect(instance.engine).toBe('geomap');
    const snap = instance.snapshot();
    expect(snap.phase).toBe('running');
  });

  it('select dispatches geomap.entity-selected with full entity record', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(validSpec as never, host, 'test-id');
    instance.dispatch({ type: 'select', target: { id: 'geom-markers-pt' } });
    const snap = instance.snapshot();
    expect(snap.selection).toContain('geom-markers-pt');
    const events = (host as unknown as { events: Array<{ name: string }> }).events;
    const selEvent = events.find((e: { name: string }) => e.name === 'geomap.entity-selected');
    expect(selEvent).toBeDefined();
  });

  it('focus dispatches geomap.entity-focused', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(validSpec as never, host, 'test-id');
    instance.dispatch({ type: 'focus', target: { id: 'geom-markers-pt' } });
    const events = (host as unknown as { events: Array<{ name: string }> }).events;
    const focusEvent = events.find((e: { name: string }) => e.name === 'geomap.entity-focused');
    expect(focusEvent).toBeDefined();
  });

  it('instantiate rejects spec with missing featureId (INVALID_SPEC from validate)', () => {
    const engine = new GeoMapEngine();
    const badSpec: GeoMapSpec = {
      ...validSpec,
      content: {
        geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
        entities: [{ id: 'ghost', type: 'state', name: 'Ghost', location: { source: 'src', featureId: 'nonexistent' } }],
        layers: [{ id: 'l', type: 'region', items: [{ entity: 'ghost' }] }],
      },
    };
    const host = makeHost();
    expect(() => engine.instantiate(badSpec as never, host)).toThrow();
  });
});

describe('GeoMapEngine display-state dispatch', () => {
  const routeSpec: GeoMapSpec = {
    type: 'geomap',
    version: '1.0.0',
    id: 'route-map',
    metadata: { title: 'Route' },
    purpose: { learningObjective: 'Routes' },
    content: {
      projection: { type: 'equirectangular' },
      geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
      entities: [
        { id: 'a', type: 'city', name: 'A', location: { coordinates: { lat: 10, lon: 20 } }, categories: ['port'] },
        { id: 'b', type: 'city', name: 'B', location: { coordinates: { lat: 11, lon: 21 } }, categories: ['port'] },
        { id: 'c', type: 'city', name: 'C', location: { coordinates: { lat: 12, lon: 22 } }, categories: ['inland'] },
      ],
      layers: [
        { id: 'ports', type: 'marker', title: 'Ports', items: [{ entity: 'a', interactive: true }, { entity: 'b', interactive: true }] },
        { id: 'inland', type: 'marker', title: 'Inland', items: [{ entity: 'c', interactive: true }] },
        { id: 'tr', type: 'route', items: [{ id: 'r1', path: ['a', 'b', 'c'], interactive: true }] },
      ],
    },
    interaction: { mode: 'explore', actions: ['select', 'focus', 'toggle', 'step', 'scrub', 'filter', 'clear-filter', 'reset'] },
    questions: [],
    sources: [{ class: 'illustrative' }],
    accessibility: { label: 'Route map' },
  };

  it('toggle emits geomap.layer-toggled and hides the layer', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'toggle', target: { id: 'geom-ports' } });
    const snap = instance.snapshot() as unknown as { displayState: { hiddenLayerIds: string[] }; scene: { semantics: Record<string, { hidden: boolean }> } };
    expect(snap.displayState.hiddenLayerIds).toContain('geom-ports');
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const evt = events.find((e: { name: string }) => e.name === 'geomap.layer-toggled');
    expect(evt).toBeDefined();
    const data = evt!.data as { layerId: string; hidden: boolean };
    expect(data.layerId).toBe('geom-ports');
    expect(data.hidden).toBe(true);
    expect(snap.scene.semantics['geom-ports']!.hidden).toBe(true);
  });

  it('step emits geomap.route-step with routeId and step', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'step', target: { id: 'geom-tr-r1' } });
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const evt = events.find((e: { name: string }) => e.name === 'geomap.route-step');
    expect(evt).toBeDefined();
    const data = evt!.data as { routeId: string; step: number };
    expect(data.routeId).toBe('r1');
    expect(data.step).toBe(1);
  });

  it('scrub emits geomap.route-step with the requested step', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'scrub', target: { id: 'geom-tr-r1' }, payload: { step: 2 } });
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const evt = events.find((e: { name: string }) => e.name === 'geomap.route-step');
    const data = evt!.data as { step: number };
    expect(data.step).toBe(2);
    const snap = instance.snapshot() as unknown as { displayState: { activeRouteSteps: Record<string, number> } };
    expect(snap.displayState.activeRouteSteps['geom-tr-r1']).toBe(2);
  });

  it('filter by ids emits geomap.filter-applied with resolved ids', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'filter', payload: { ids: ['geom-ports-a'] } });
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const evt = events.find((e: { name: string }) => e.name === 'geomap.filter-applied');
    const data = evt!.data as { ids: string[] };
    expect(data.ids).toEqual(['geom-ports-a']);
  });

  it('filter by categories resolves to node ids via item metadata categories', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'filter', payload: { categories: ['port'] } });
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const evt = events.find((e: { name: string }) => e.name === 'geomap.filter-applied');
    const data = evt!.data as { ids: string[]; categories: string[] };
    const expected = ['geom-ports-a', 'geom-ports-b', 'geom-tr-r1-seg-0', 'geom-tr-r1-seg-1'].sort();
    expect(data.ids.sort()).toEqual(expected);
    expect(data.categories).toEqual(['port']);
    const snap = instance.snapshot() as unknown as { filter: string[]; displayState: { filterCategories: string[] } };
    for (const id of data.ids) {
      expect(snap.filter).toContain(id);
    }
  });

  it('clear-filter emits geomap.filter-applied with ids [] and restores visibility', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'filter', payload: { ids: ['geom-ports-a'] } });
    instance.dispatch({ type: 'clear-filter' });
    const events = (host as unknown as { events: Array<{ name: string; data?: unknown }> }).events;
    const clearEvt = events.filter((e: { name: string }) => e.name === 'geomap.filter-applied').pop();
    const data = clearEvt!.data as { ids: string[] };
    expect(data.ids).toEqual([]);
    const snap = instance.snapshot() as unknown as { displayState: { filterCategories: string[] } };
    expect(snap.displayState.filterCategories).toEqual([]);
  });

  it('reset clears display maps', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'toggle', target: { id: 'geom-ports' } });
    instance.dispatch({ type: 'step', target: { id: 'geom-tr-r1' } });
    instance.dispatch({ type: 'reset' });
    const snap = instance.snapshot() as unknown as {
      displayState: { hiddenLayerIds: string[]; activeRouteSteps: Record<string, number>; filterCategories: string[] };
    };
    expect(snap.displayState.hiddenLayerIds).toEqual([]);
    expect(Object.keys(snap.displayState.activeRouteSteps).length).toBe(0);
    expect(snap.displayState.filterCategories).toEqual([]);
  });

  it('replays identical dispatch sequence to identical scene (P4)', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(routeSpec as never, host, 'route-map');
    instance.dispatch({ type: 'toggle', target: { id: 'geom-inland' } });
    instance.dispatch({ type: 'step', target: { id: 'geom-tr-r1' } });
    instance.dispatch({ type: 'filter', payload: { categories: ['port'] } });
    const snapAfter = instance.snapshot() as unknown as { scene: unknown; displayState: unknown };
    const snapshotOf = JSON.stringify({ scene: snapAfter.scene, displayState: snapAfter.displayState });

    const engine2 = new GeoMapEngine();
    const host2 = makeHost();
    const instance2 = engine2.instantiate(routeSpec as never, host2, 'route-map');
    instance2.dispatch({ type: 'toggle', target: { id: 'geom-inland' } });
    instance2.dispatch({ type: 'step', target: { id: 'geom-tr-r1' } });
    instance2.dispatch({ type: 'filter', payload: { categories: ['port'] } });
    const snapAfter2 = instance2.snapshot() as unknown as { scene: unknown; displayState: unknown };
    expect(JSON.stringify({ scene: snapAfter2.scene, displayState: snapAfter2.displayState })).toBe(snapshotOf);
  });
});

describe('GeoMapEngine scale bar', () => {
  it('snapshot exposes scaleBar with lengthKm, lengthPx, unit, label', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(validSpec as never, host, 'test-map');
    const snap = instance.snapshot() as unknown as { scaleBar: { lengthKm: number; lengthPx: number; unit: string; label: string } };
    expect(snap.scaleBar.lengthPx).toBeGreaterThan(0);
    expect(snap.scaleBar.unit).toBe('km');
    expect(snap.scaleBar.label.length).toBeGreaterThan(0);
  });

  it('alternative list gains a scale-bar row', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(validSpec as never, host, 'test-map');
    const snap = instance.snapshot() as unknown as { alternative: Array<{ type: string }> };
    expect(snap.alternative.some((r) => r.type === 'scale-bar')).toBe(true);
  });

  it('scale-bar unit mi is honored', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const miSpec: GeoMapSpec = {
      ...validSpec,
      content: { ...validSpec.content!, scaleBar: { visible: true, unit: 'mi' } },
    };
    const instance = engine.instantiate(miSpec as never, host, 'test-map-mi');
    const snap = instance.snapshot() as unknown as { scaleBar: { unit: string; label: string } };
    expect(snap.scaleBar.unit).toBe('mi');
    expect(snap.scaleBar.label.endsWith('MI')).toBe(true);
  });

  it('scale bar is deterministic across instances', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const a = engine.instantiate(validSpec as never, host, 'a');
    const b = engine.instantiate(validSpec as never, host, 'b');
    const snapA = a.snapshot() as unknown as { scaleBar: unknown };
    const snapB = b.snapshot() as unknown as { scaleBar: unknown };
    expect(JSON.stringify(snapA.scaleBar)).toBe(JSON.stringify(snapB.scaleBar));
  });
});