import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DiagramEngine } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(__dirname, '..', 'fixture');
const SKILL_EXAMPLE_URL = new URL('../../../docs/fixtures/diagram/skill-example.json', import.meta.url);

function* walkFixtures(dir: string): Generator<{ kind: string; file: string }> {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      yield* walkFixtures(resolve(dir, entry.name));
    } else if (entry.name === 'input.diagram.json') {
      yield { kind: dir.split('/').pop() ?? 'unknown', file: resolve(dir, entry.name) };
    }
  }
}

describe('Golden fixtures', () => {
  const engine = new DiagramEngine();

  for (const { kind, file } of walkFixtures(fixtureRoot)) {
    it(`${kind}: ${file.split('/').pop()} - round-trip validation`, () => {
      const spec = JSON.parse(readFileSync(file, 'utf-8'));
      const result = engine.validate(spec);
      expect(result.valid).toBe(true);
    });

    it(`${kind}: determinism - two runs produce identical SVG`, () => {
      const spec = JSON.parse(readFileSync(file, 'utf-8'));
      const host = {
        locale: 'en' as const,
        tokens: {},
        reducedMotion: false,
        announce: () => {},
        onEvent: () => {},
        resolveAsset: (id: string) => id,
      };
      const inst1 = engine.instantiate(spec, host, `${kind}-test1`);
      const inst2 = engine.instantiate(spec, host, `${kind}-test2`);
      const s1 = inst1.snapshot() as unknown as { svgResult: { svg: string } };
      const s2 = inst2.snapshot() as unknown as { svgResult: { svg: string } };
      expect(s1.svgResult.svg).toBe(s2.svgResult.svg);
    });
  }

  it('water-cycle fixture every positionSource is illustrative', () => {
    const spec = JSON.parse(readFileSync(resolve(fixtureRoot, 'water-cycle', 'input.diagram.json'), 'utf-8'));
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: () => {},
      resolveAsset: (id: string) => id,
    };
    const inst = engine.instantiate(spec, host, 'water-cycle-fixture');
    const snap = inst.snapshot() as unknown as { scene: { nodes: Array<{ kind: string; children: Array<Record<string, unknown>> }> } };
    const root = snap.scene.nodes.find((n: { kind: string }) => n.kind === 'diagram');
    const nodeChildren = root!.children.filter((n: Record<string, unknown>) => n.kind === 'node');
    for (const n of nodeChildren) {
      expect(n.positionSource).toBe('illustrative');
    }
  });

  it('skill example round-trips DiagramEngine.validate', () => {
    const spec = JSON.parse(readFileSync(SKILL_EXAMPLE_URL, 'utf8'));
    const result = new DiagramEngine().validate(spec);
    expect(result.valid, result.issues.map((i) => i.message).join('; ')).toBe(true);
  });
});