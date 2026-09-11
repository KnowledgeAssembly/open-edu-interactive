import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GeoMapEngine } from '../src/engine.js';
import { bucketIndex } from '../src/scene/derive.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(HERE, '..', 'fixture', 'encoding', 'input.geomap.json'), 'utf8'));

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

describe('bucketIndex', () => {
  const bps: Array<[number, number]> = [[0, 100], [100, 250], [250, 1000]];
  it('assigns contiguous buckets by value', () => {
    expect(bucketIndex(10, bps)).toBe(1);
    expect(bucketIndex(99, bps)).toBe(1);
    expect(bucketIndex(100, bps)).toBe(2);
    expect(bucketIndex(249, bps)).toBe(2);
    expect(bucketIndex(300, bps)).toBe(3);
    expect(bucketIndex(1000, bps)).toBe(3);
  });
  it('clamps below-first and above-last', () => {
    expect(bucketIndex(-5, bps)).toBe(1);
    expect(bucketIndex(5000, bps)).toBe(3);
  });
});

describe('attr-encoding fixture', () => {
  it('validates and encodes every region into encoding-bucket-N', () => {
    const engine = new GeoMapEngine();
    const result = engine.validate(spec as never);
    expect(result.valid).toBe(true);

    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'encoding');
    const snap = instance.snapshot() as unknown as { scene: { semantics: Record<string, { metadata?: Record<string, unknown> }> } };
    const expectBucket: Record<string, string> = {
      'geom-eco-r1': 'encoding-bucket-1',
      'geom-eco-r2': 'encoding-bucket-2',
      'geom-eco-r3': 'encoding-bucket-3',
      'geom-eco-r4': 'encoding-bucket-3',
      'geom-eco-r5': 'encoding-bucket-1',
    };
    for (const [id, bucket] of Object.entries(expectBucket)) {
      expect(snap.scene.semantics[id]!.metadata?.encodingBucket).toBe(bucket);
    }
  });

  it('svg carries data-oedu-encoding on every encoded node', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'encoding');
    const snap = instance.snapshot() as unknown as { svgResult: { svg: string } };
    const svg = snap.svgResult.svg;
    expect(svg.match(/data-oedu-encoding="encoding-bucket-1"/g)).toBeTruthy();
    expect(svg.match(/data-oedu-encoding="encoding-bucket-2"/g)).toBeTruthy();
    expect(svg.match(/data-oedu-encoding="encoding-bucket-3"/g)).toBeTruthy();
    expect(svg).not.toMatch(/data-oedu-encoding="bucket-/);
  });

  it('auto-legend appends bucket entries after authored items', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'encoding');
    const snap = instance.snapshot() as unknown as { scene: { semantics: Record<string, { children?: Array<{ label?: string; metadata?: Record<string, unknown> }> }> } };
    const legendNode = snap.scene.semantics['geom-legend'] as unknown as { children: Array<{ label?: string; metadata?: Record<string, unknown> }> };
    const children = legendNode.children;
    expect(children[0]!.label).toBe('Region');
    const bucketLabels = children.slice(1).map((c) => c.label);
    expect(bucketLabels).toEqual(['area: [0–100)', 'area: [100–250)', 'area: [250–1000)']);
    for (const c of children.slice(1)) {
      expect(c.metadata?.encodingBucket).toMatch(/^encoding-bucket-\d+$/);
    }
  });

  it('encoded nodes keep aria-label and measureValue in alternative', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'encoding');
    const snap = instance.snapshot() as unknown as {
      svgResult: { svg: string };
      alternative: Array<{ entityId: string; name: string; measureValue?: number; encodingBucket?: string }>;
    };
    expect(snap.svgResult.svg).toContain('aria-label="R2-Medium"');
    const row = snap.alternative.find((r) => r.entityId === 'r2');
    expect(row).toBeDefined();
    expect(row!.measureValue).toBe(150);
  });

  it('category filter plus encoding coexist', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'encoding');
    instance.dispatch({ type: 'filter', payload: { categories: ['zone-b'] } });
    const events = host.events;
    const evt = events.find((e) => e.name === 'geomap.filter-applied');
    const data = evt!.data as { ids: string[] };
    expect(data.ids.sort()).toEqual(['geom-eco-r3', 'geom-eco-r4'].sort());
    const snap = instance.snapshot() as unknown as {
      scene: { semantics: Record<string, { hidden?: boolean }> };
    };
    expect(snap.scene.semantics['geom-eco-r3']!.hidden).toBe(false);
    expect(snap.scene.semantics['geom-eco-r1']!.hidden).toBe(true);
  });
});