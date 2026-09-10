import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISUAL_KINDS, validateVisualSpec } from '../src/schema.js';

const SCHEMA_URL = new URL('../src/schemas/visual-spec.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, Record<string, unknown>>;
};

describe('schema parity guardrail — visual', () => {
  it('includes fraction-circle in VISUAL_KINDS', () => {
    expect(VISUAL_KINDS).toContain('fraction-circle');
  });

  it('content.kind.enum (sorted) matches VISUAL_KINDS (sorted)', () => {
    const kinds: string[] = (schema.properties?.kind as { enum?: string[] })?.enum ?? [];
    expect([...kinds].sort()).toEqual([...VISUAL_KINDS].sort());
  });

  it('content.kind is required', () => {
    expect(schema.required).toContain('kind');
  });

  it('content has additionalProperties === false', () => {
    expect(schema.additionalProperties).toBe(false);
  });

  it('content.entities exists for illustration entities', () => {
    const entities = schema.properties?.entities as
      | { items?: { additionalProperties?: boolean; required?: string[] } }
      | undefined;
    expect(entities).toBeDefined();
    expect(entities!.items?.additionalProperties).toBe(false);
    expect(entities!.items?.required).toContain('id');
    expect(entities!.items?.required).toContain('label');
  });

  it('schema text does not contain LLM-pleaser props', () => {
    const text = readFileSync(SCHEMA_URL, 'utf8');
    expect(text).not.toMatch(/makeItPretty/);
    expect(text).not.toMatch(/svgMagic/);
    expect(text).not.toMatch(/drawNicely/);
  });
});

describe('ValidateVisualSpec', () => {
  it('parses a minimal number-line content', () => {
    const result = validateVisualSpec({
      kind: 'number-line',
      range: { min: 0, max: 10, step: 1 },
      highlight: [7],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown kind "timeline"', () => {
    const result = validateVisualSpec({ kind: 'timeline' });
    expect(result.valid).toBe(false);
  });

  it('rejects an unknown key on content', () => {
    const result = validateVisualSpec({
      kind: 'number-line',
      makeItPretty: true,
    } as never);
    expect(result.valid).toBe(false);
  });
});
