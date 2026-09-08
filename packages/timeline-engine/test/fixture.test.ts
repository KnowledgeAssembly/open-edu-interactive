import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TimelineEngine } from '../src/engine.js';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';

const FIXTURE_DIR = new URL('../fixture/', import.meta.url);
const SUITES = ['events', 'periods', 'tracks', 'independence'];
const SKILL_EXAMPLE_URL = new URL('../../../docs/fixtures/timeline/skill-example.json', import.meta.url);

function loadFixture(name: string): EngineSpec {
  const url = new URL(`${name}/input.timeline.json`, FIXTURE_DIR);
  return JSON.parse(readFileSync(url, 'utf8')) as EngineSpec;
}

describe('fixture round-trip', () => {
  for (const suite of SUITES) {
    it(`${suite}: validates and instantiates`, () => {
      const spec = loadFixture(suite);
      const engine = new TimelineEngine();
      const result = engine.validate(spec);
      expect(result.valid, `fixture "${suite}" validation failed: ${result.issues.map((i) => i.message).join('; ')}`).toBe(true);

      const host = { locale: 'en', tokens: {}, reducedMotion: false, announce: () => undefined, onEvent: () => undefined, resolveAsset: (id: string) => id };
      const instance = engine.instantiate(spec, host, `fixture-${suite}`);
      const snap = instance.snapshot() as Record<string, unknown>;
      expect(snap).toHaveProperty('scene');
      expect(snap).toHaveProperty('svgResult');
      expect(snap).toHaveProperty('linear');
      instance.teardown();
    });
  }

  it('skill example validates through TimelineEngine', () => {
    const spec = JSON.parse(readFileSync(SKILL_EXAMPLE_URL, 'utf8')) as EngineSpec;
    const engine = new TimelineEngine();
    const result = engine.validate(spec);
    expect(result.valid, `skill example validation failed: ${result.issues.map((i) => i.message).join('; ')}`).toBe(true);
  });
});