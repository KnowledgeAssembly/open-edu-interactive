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
      sources: [{ id: 'src', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }],
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
  sources: [{ class: 'authoritative' }],
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
        geography: { sources: [{ id: 'src', type: 'geojson', class: 'authoritative', data: { type: 'FeatureCollection', features: [] } }] },
        entities: [{ id: 'ghost', type: 'state', name: 'Ghost', location: { source: 'src', featureId: 'nonexistent' } }],
        layers: [{ id: 'l', type: 'region', items: [{ entity: 'ghost' }] }],
      },
    };
    const host = makeHost();
    expect(() => engine.instantiate(badSpec as never, host)).toThrow();
  });
});