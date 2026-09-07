import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChartEngine } from '../src/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string): { spec: Record<string, unknown>; expected: { valid: boolean; issues: unknown[] } } {
  const specPath = resolve(__dirname, '..', 'fixture', name, 'input.chart.json');
  const validationPath = resolve(__dirname, '..', 'fixture', name, 'validation.json');
  const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
  const expected = JSON.parse(readFileSync(validationPath, 'utf-8')) as { valid: boolean; issues: unknown[] };
  return { spec, expected };
}

const FIXTURES = ['bar', 'line'];

describe('chart engine golden fixtures', () => {
  for (const name of FIXTURES) {
    it(`validates ${name} fixture`, () => {
      const { spec, expected } = loadFixture(name);
      const engine = new ChartEngine();
      const result = engine.validate(spec as never);
      expect(result.valid).toBe(expected.valid);
      expect(result.issues).toEqual(expected.issues);
    });
  }
});