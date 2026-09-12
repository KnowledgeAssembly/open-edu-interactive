import { describe, it, expect } from 'vitest';
import { validateSkillExample } from '../src/validate-example.js';
import { loadSkillExample } from '../src/manifest.js';
import { validateEnvelope } from '@knowledgeassemble/interactive-engine';

const ENGINES = ['visual', 'chart', 'geomap', 'timeline', 'diagram', 'composition'];

describe('skill-example round-trip', () => {
  for (const type of ENGINES) {
    it(`${type} example validates against its schema`, () => {
      const result = validateSkillExample(type);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe('composition embedded L1 round-trip', () => {
  it('every engines[].spec passes envelope validation', () => {
    const lesson = loadSkillExample('composition') as {
      engines: { spec: unknown }[];
    };
    for (const entry of lesson.engines) {
      const result = validateEnvelope(entry.spec);
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });
});