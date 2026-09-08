import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateEnvelope } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const COMPAT_DIR = resolve(THIS_DIR, '../../../docs/fixtures/p7/widget-compat/');
const ENGINE_REPS_URL = resolve(THIS_DIR, '../../../docs/fixtures/p7/engine-reps.json');

const ENGINE_FOR_MAPPING: Record<string, () => { validate(spec: EngineSpec): { valid: boolean; issues: Array<{ message: string }> } }> = {
  visual: () => new VisualEngine(),
  timeline: () => new TimelineEngine(),
};

const ENGINE_REPS = JSON.parse(readFileSync(ENGINE_REPS_URL, 'utf8')) as Record<string, EngineSpec>;

interface CompatMapping {
  legacyType: string;
  engine: string | null;
  specContentKind: string | null;
  notes: string;
}

describe('widget-compat round-trip', () => {
  const files = readdirSync(COMPAT_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const mapping = JSON.parse(readFileSync(resolve(COMPAT_DIR, file), 'utf8')) as CompatMapping;

    it(`${mapping.legacyType}: mapped interactive node validates through the target engine (L1 + L2, closed set)`, () => {
      if (mapping.engine === null) {
        expect(mapping.specContentKind).toBeNull();
        expect(mapping.notes).toContain('No mapping at P7');
        return;
      }

      const factory = ENGINE_FOR_MAPPING[mapping.engine];
      expect(factory, `no engine factory for mapped engine "${mapping.engine}"`).toBeDefined();
      const engineFactory = factory!;

      // A mapped widget resolves to a complete representative spec of the target engine's closed kind.
      const rep = ENGINE_REPS[mapping.engine];
      expect(rep, `no representative spec for engine "${mapping.engine}"`).toBeDefined();
      const fullSpec = rep!;
      expect(fullSpec.content?.kind).toBe(mapping.specContentKind);

      const l1 = validateEnvelope(fullSpec);
      expect(l1.valid, `L1 envelope should pass for mapped ${mapping.legacyType}`).toBe(true);

      const engine = engineFactory();
      const l2 = engine.validate(fullSpec);
      expect(l2.valid, `L2 engine validation must pass for mapped ${mapping.legacyType} (closed set)`).toBe(true);
    });
  }

  it('no silently-broadened kind: a kind outside the target engine closed set fails L2', () => {
    // A fabricated visual kind (e.g. a would-be deep "hotspot") is rejected by the real engine.
    const spec: EngineSpec = { type: 'visual', version: '1.0.0', id: 'widened', content: { kind: 'hotspot' } };
    expect(validateEnvelope(spec).valid).toBe(true); // L1 envelope is kind-agnostic
    expect(new VisualEngine().validate(spec).valid).toBe(false); // L2 closed set rejects it
  });

  it('every engine referenced by a mapping is a real engine with a closed kind set', () => {
    for (const file of files) {
      const mapping = JSON.parse(readFileSync(resolve(COMPAT_DIR, file), 'utf8')) as CompatMapping;
      if (mapping.engine !== null) {
        expect(ENGINE_FOR_MAPPING[mapping.engine], `engine "${mapping.engine}" for ${mapping.legacyType}`).toBeDefined();
        expect(mapping.specContentKind, `specContentKind for ${mapping.legacyType}`).not.toBeNull();
        expect(ENGINE_REPS[mapping.engine]?.content?.kind, `repr kind for ${mapping.legacyType}`).toBe(mapping.specContentKind);
      }
    }
  });
});
