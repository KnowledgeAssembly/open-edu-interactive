import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHART_KINDS, SOURCE_CLASSES, DIMENSION_TYPES } from '../src/schema.js';

const SCHEMA_URL = new URL('../src/schemas/chart-spec.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, unknown>;
};

type Obj = Record<string, unknown>;

function take(obj: Obj, ...path: string[]): Obj {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return {};
    cur = (cur as Obj)[key];
  }
  return (cur as Obj) ?? {};
}

describe('schema parity guardrail — chart', () => {
  it('type is const "chart"', () => {
    expect(take(schema.properties ?? {}, 'type', 'const')).toEqual('chart');
  });

  it('sources and content are required at the spec level', () => {
    expect(schema.required).toContain('sources');
    expect(schema.required).toContain('content');
  });

  const content = take(schema.properties ?? {}, 'content');

  it('content.kind.enum (sorted) matches CHART_KINDS (sorted)', () => {
    const kinds = (take(content, 'properties', 'kind', 'enum') as unknown as string[]) ?? [];
    expect([...kinds].sort()).toEqual([...CHART_KINDS].sort());
  });

  it('content.kind/content.dimensions/content.measures/content.data required', () => {
    const required = content['required'] as string[];
    expect(required).toContain('kind');
    expect(required).toContain('dimensions');
    expect(required).toContain('measures');
    expect(required).toContain('data');
  });

  it('content has additionalProperties === false', () => {
    expect(content['additionalProperties']).toBe(false);
  });

  it('dimensions[].type enum matches DIMENSION_TYPES and is additionalProperties false', () => {
    const dims = take(content, 'properties', 'dimensions', 'items');
    expect(dims['additionalProperties']).toBe(false);
    const types = (take(dims, 'properties', 'type', 'enum') as unknown as string[]) ?? [];
    expect([...types].sort()).toEqual([...DIMENSION_TYPES].sort());
  });

  it('measures[].additionalProperties === false and type is const "quantitative"', () => {
    const meas = take(content, 'properties', 'measures', 'items');
    expect(meas['additionalProperties']).toBe(false);
    expect(take(meas, 'properties', 'type', 'const')).toBe('quantitative');
  });

  it('data rows allow additional properties (dynamic keys)', () => {
    const data = take(content, 'properties', 'data', 'items');
    expect(data['additionalProperties']).toBe(true);
  });

  it('sources[] requires exactly one entry minimum and class enum matches SOURCE_CLASSES', () => {
    const sources = take(schema.properties ?? {}, 'sources');
    expect(sources['minItems']).toBe(1);
    const classes = (take(sources, 'items', 'properties', 'class', 'enum') as unknown as string[]) ?? [];
    expect([...classes].sort()).toEqual([...SOURCE_CLASSES].sort());
  });

  it('schema text does not contain LLM-pleaser props or geometry keys', () => {
    const text = readFileSync(SCHEMA_URL, 'utf8');
    expect(text).not.toMatch(/makeItPretty/);
    expect(text).not.toMatch(/svgMagic/);
    expect(text).not.toMatch(/drawNicely/);
    expect(text).not.toMatch(/\bwidth\b/);
    expect(text).not.toMatch(/^\s*"x"/m);
    expect(text).not.toMatch(/^\s*"y"/m);
  });
});