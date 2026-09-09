import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VisualEngine } from '../src/engine.js';

const FIXTURE_ROOT = new URL('../fixture/', import.meta.url);
const engine = new VisualEngine();

function* walkFixtures(dir: URL): Generator<{ kind: string; dir: URL }> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      yield* walkFixtures(new URL(`${entry.name}/`, dir));
    } else if (entry.name === 'input.visual.json') {
      yield { kind: dir.pathname.split('/').filter(Boolean).pop() ?? 'unknown', dir };
    }
  }
}

const allFixtures = [...walkFixtures(FIXTURE_ROOT)];
const BASELINE_KINDS = new Set(['clock', 'comparison', 'coordinate-grid', 'counting-set', 'fraction', 'fraction-comparison', 'geometry', 'illustration', 'number-line']);
const baselineFixtures = allFixtures.filter(f => BASELINE_KINDS.has(f.kind));
const newFixtures = allFixtures.filter(f => !BASELINE_KINDS.has(f.kind));

function makeHost() {
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

describe('golden visual fixtures', () => {
  it('covers all nine frozen visual kinds', () => {
    const kinds = baselineFixtures.map((f) => f.kind).sort();
    expect(kinds).toEqual([
      'clock',
      'comparison',
      'coordinate-grid',
      'counting-set',
      'fraction',
      'fraction-comparison',
      'geometry',
      'illustration',
      'number-line',
    ]);
  });

  for (const { kind, dir } of baselineFixtures) {
    const spec = JSON.parse(readFileSync(new URL('input.visual.json', dir), 'utf-8'));

    it(`${kind}: round-trip validation matches validation.json`, () => {
      const result = engine.validate(spec);
      expect(result).toEqual(JSON.parse(readFileSync(new URL('validation.json', dir), 'utf-8')));
    });

    it(`${kind}: golden expected artifacts are byte-stable`, () => {
      const inst = engine.instantiate(spec, makeHost(), `${kind}-golden`);
      const snap = inst.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; interactive: unknown };
      };
      expect(snap.svgResult.svg).toBe(readFileSync(new URL('expected.svg', dir), 'utf-8'));
      expect(JSON.stringify(snap.scene, null, 2) + '\n').toBe(
        readFileSync(new URL('expected.scene.json', dir), 'utf-8'),
      );
      expect(JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2) + '\n').toBe(
        readFileSync(new URL('expected.a11y.json', dir), 'utf-8'),
      );
    });

    it(`${kind}: determinism - two instances produce identical SVG`, () => {
      const inst1 = engine.instantiate(spec, makeHost(), `${kind}-det1`);
      const inst2 = engine.instantiate(spec, makeHost(), `${kind}-det2`);
      const s1 = inst1.snapshot() as unknown as { svgResult: { svg: string } };
      const s2 = inst2.snapshot() as unknown as { svgResult: { svg: string } };
      expect(s2.svgResult.svg).toBe(s1.svgResult.svg);
    });
  }

  for (const { kind, dir } of newFixtures) {
    const spec = JSON.parse(readFileSync(new URL('input.visual.json', dir), 'utf-8'));

    it(`${kind}: round-trip validation matches validation.json`, () => {
      const result = engine.validate(spec);
      expect(result).toEqual(JSON.parse(readFileSync(new URL('validation.json', dir), 'utf-8')));
    });

    it(`${kind}: golden expected artifacts are byte-stable`, () => {
      const inst = engine.instantiate(spec, makeHost(), `${kind}-golden`);
      const snap = inst.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; interactive: unknown };
      };
      expect(snap.svgResult.svg).toBe(readFileSync(new URL('expected.svg', dir), 'utf-8'));
      expect(JSON.stringify(snap.scene, null, 2) + '\n').toBe(
        readFileSync(new URL('expected.scene.json', dir), 'utf-8'),
      );
      expect(JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2) + '\n').toBe(
        readFileSync(new URL('expected.a11y.json', dir), 'utf-8'),
      );
    });

    it(`${kind}: has at least one interactive node`, () => {
      const inst = engine.instantiate(spec, makeHost(), `${kind}-interactive`);
      const snap = inst.snapshot() as unknown as {
        scene: { nodes: Array<{ id: string; interactive?: boolean; children: unknown[] }> };
      };
      function hasInteractive(nodes: Array<{ id: string; interactive?: boolean; children: unknown[] }>): boolean {
        for (const n of nodes) {
          if (n.interactive) return true;
          if (hasInteractive(n.children as Array<{ id: string; interactive?: boolean; children: unknown[] }>)) return true;
        }
        return false;
      }
      expect(hasInteractive(snap.scene.nodes)).toBe(true);
    });

    it(`${kind}: determinism - two instances produce identical SVG`, () => {
      const inst1 = engine.instantiate(spec, makeHost(), `${kind}-det1`);
      const inst2 = engine.instantiate(spec, makeHost(), `${kind}-det2`);
      const s1 = inst1.snapshot() as unknown as { svgResult: { svg: string } };
      const s2 = inst2.snapshot() as unknown as { svgResult: { svg: string } };
      expect(s2.svgResult.svg).toBe(s1.svgResult.svg);
    });
  }
});
