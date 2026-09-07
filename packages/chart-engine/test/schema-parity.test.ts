import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHART_KINDS } from '../src/schema.js';

const SCHEMA_URL = new URL('../src/schemas/chart-spec.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, Record<string, unknown>>;
};

describe('schema parity guardrail — chart', () => {
  it('content.kind.enum (sorted) matches CHART_KINDS (sorted)', () => {
    const kinds: string[] = (schema.properties?.kind as { enum?: string[] })?.enum ?? [];
    expect([...kinds].sort()).toEqual([...CHART_KINDS].sort());
  });

  it('content.kind is required', () => {
    expect(schema.required).toContain('kind');
  });

  it('content.dimensions is required', () => {
    expect(schema.required).toContain('dimensions');
  });

  it('content.measures is required', () => {
    expect(schema.required).toContain('measures');
  });

  it('content.data is required', () => {
    expect(schema.required).toContain('data');
  });

  it('content has additionalProperties === false', () => {
    expect(schema.additionalProperties).toBe(false);
  });

  it('dimensions[].additionalProperties === false', () => {
    const dims = schema.properties?.dimensions as { items?: { additionalProperties?: boolean } };
    expect(dims?.items?.additionalProperties).toBe(false);
  });

  it('measures[].additionalProperties === false and type is const "quantitative"', () => {
    const meas = schema.properties?.measures as {
      items?: { additionalProperties?: boolean; properties?: Record<string, { const?: string }> };
    };
    expect(meas?.items?.additionalProperties).toBe(false);
    expect(meas?.items?.properties?.type?.const).toBe('quantitative');
  });

  it('schema text does not contain LLM-pleaser props or geometry keys', () => {
    const text = readFileSync(SCHEMA_URL, 'utf8');
    expect(text).not.toMatch(/makeItPretty/);
    expect(text).not.toMatch(/svgMagic/);
    expect(text).not.toMatch(/drawNicely/);
    expect(text).not.toMatch(/\bx\b/);
    expect(text).not.toMatch(/\by\b/);
  });
});