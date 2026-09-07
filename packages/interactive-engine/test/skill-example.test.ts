import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateEnvelope } from '../src/validation/validate.js';
import { LessonSchema } from '../src/composition/schema.js';

const FIXTURE_URL = new URL('../../../docs/fixtures/composition/skill-example.json', import.meta.url);
const fixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));

describe('composition skill example', () => {
  it('validates against the composition schema (Zod port)', () => {
    const result = LessonSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('each embedded engine spec passes L1 (envelope) validation', () => {
    for (const entry of fixture.engines as Array<{ instanceId: string; spec: unknown }>) {
      const l1 = validateEnvelope(entry.spec);
      expect(l1.valid).toBe(true);
    }
  });

  it('each embedded engine entry has engine === spec.type', () => {
    for (const entry of fixture.engines as Array<{ instanceId: string; engine: string; spec: { type: string } }>) {
      expect(entry.engine).toBe(entry.spec.type);
    }
  });
});
