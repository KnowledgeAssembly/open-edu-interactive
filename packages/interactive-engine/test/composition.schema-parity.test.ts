import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION_TYPES, COMPOSITION, ENGINE_TYPES, NAMESPACED_EVENT_PATTERN } from '../src/index.js';

const COMPOSITION_SCHEMA_URL = new URL('../../../docs/schemas/composition.schema.json', import.meta.url);
const ENVELOPE_SCHEMA_URL = new URL('../../../docs/schemas/interactive-engine.schema.json', import.meta.url);

type JsonSchema = {
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, Record<string, unknown>>;
  items?: JsonSchema;
};

function readSchema(url: URL): JsonSchema {
  return JSON.parse(readFileSync(url, 'utf8')) as JsonSchema;
}

const composition = readSchema(COMPOSITION_SCHEMA_URL);
const envelope = readSchema(ENVELOPE_SCHEMA_URL);

describe('schema parity guardrail — composition', () => {
  it('root requires id/engines/bindings and forbids unknown keys', () => {
    expect(composition.additionalProperties).toBe(false);
    expect(composition.required).toEqual(['id', 'engines', 'bindings']);
  });

  it('engine entry requires instanceId/engine/spec and forbids unknown keys', () => {
    const engines = composition.properties?.engines as unknown as { items?: JsonSchema } | undefined;
    const engineEntry = engines?.items;
    expect(engineEntry?.additionalProperties).toBe(false);
    expect(engineEntry?.required).toEqual(['instanceId', 'engine', 'spec']);
  });

  it('engine enum matches ENGINE_TYPES', () => {
    const engineEntry = (composition.properties?.engines as { items?: JsonSchema }).items as JsonSchema;
    const engine = engineEntry.properties?.engine as { enum?: string[] } | undefined;
    expect(engine?.enum).toEqual([...ENGINE_TYPES]);
  });

  it('binding requires on/from/dispatch and forbids unknown keys', () => {
    const bindings = composition.properties?.bindings as { items?: JsonSchema };
    const binding = bindings.items as JsonSchema;
    expect(binding.additionalProperties).toBe(false);
    expect(binding.required).toEqual(['on', 'from', 'dispatch']);
  });

  it('binding.on pattern matches NAMESPACED_EVENT_PATTERN', () => {
    const binding = (composition.properties?.bindings as { items?: JsonSchema }).items as JsonSchema;
    const on = binding.properties?.on as { pattern?: string } | undefined;
    expect(on?.pattern).toBe(NAMESPACED_EVENT_PATTERN.source);
  });

  it('dispatch requires to/action and forbids unknown keys', () => {
    const binding = (composition.properties?.bindings as { items?: JsonSchema }).items as JsonSchema;
    const dispatch = binding.properties?.dispatch as JsonSchema;
    expect(dispatch.additionalProperties).toBe(false);
    expect(dispatch.required).toEqual(['to', 'action']);
  });

  it('dispatch.action $ref resolves to the D5 ACTION_TYPES enum', () => {
    const binding = (composition.properties?.bindings as { items?: JsonSchema }).items as JsonSchema;
    const dispatch = binding.properties?.dispatch as JsonSchema;
    const ref = dispatch.properties?.action as { $ref?: string } | undefined;
    const defName = ref?.$ref?.split('#/$defs/').pop();
    const defs = (envelope as { $defs?: Record<string, { enum?: string[] }> }).$defs ?? {};
    const actionType = defs[defName ?? ''];
    expect(actionType?.enum).toEqual([...ACTION_TYPES]);
  });
});

describe('COMPOSITION constants stay in sync', () => {
  it('COMPOSITION.ENGINE_TYPES is the schema singleton (not a duplicate)', () => {
    expect(COMPOSITION.ENGINE_TYPES).toBe(ENGINE_TYPES);
  });

  it('COMPOSITION.EVENT_NAME_PATTERN is the schema pattern source', () => {
    expect(COMPOSITION.EVENT_NAME_PATTERN).toBe(NAMESPACED_EVENT_PATTERN.source);
  });
});