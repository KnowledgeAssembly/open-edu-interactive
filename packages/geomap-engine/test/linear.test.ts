import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GeoMapEngine } from '../src/engine.js';
import { buildScene } from '../src/scene/build.js';
import { deriveDisplay, emptyMaps } from '../src/scene/derive.js';
import type { GeoMapContent } from '../src/schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const linearSpec = JSON.parse(readFileSync(join(HERE, '..', 'fixture', 'linear', 'input.geomap.json'), 'utf8')) as never;
const content = (linearSpec as { content: GeoMapContent }).content;

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
    const instance = engine.instantiate(linearSpec, host, 'linear');
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
    const instance = engine.instantiate(linearSpec, host, 'linear');
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
    const instance = engine.instantiate(linearSpec, host, 'linear');
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