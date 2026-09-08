import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Ajv } from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { Ajv as AjvInstance } from 'ajv';
import addMetaSchema2020Module from 'ajv/dist/refs/json-schema-2020-12/index.js';
import { validateEnvelope } from '../../src/validation/validate.js';
import { LessonSchema } from '../../src/composition/schema.js';
import { ENGINE_TYPES } from '../../src/composition/schema.js';

const addMetaSchema2020 = (
  addMetaSchema2020Module as unknown as { default?: (this: AjvInstance) => void }
).default ?? (addMetaSchema2020Module as unknown as (this: AjvInstance) => void);

const NODE_SCHEMA_URL = new URL('../../../../docs/schemas/interactive-lesson-node.schema.json', import.meta.url);
const ENGINE_SCHEMA_URL = new URL('../../../../docs/schemas/interactive-engine.schema.json', import.meta.url);
const COMPOSED_FIXTURE_URL = new URL('../../../../docs/fixtures/p7/composed-lesson.json', import.meta.url);
const ENGINE_REPS_URL = new URL('../../../../docs/fixtures/p7/engine-reps.json', import.meta.url);

const engineSchemaText = readFileSync(ENGINE_SCHEMA_URL, 'utf8');
const engineSchema = JSON.parse(engineSchemaText) as Record<string, unknown>;
const nodeSchemaText = readFileSync(NODE_SCHEMA_URL, 'utf8');
const nodeSchema = JSON.parse(nodeSchemaText) as Record<string, unknown>;

const ajv = new Ajv({ strict: false, allErrors: true });
addMetaSchema2020.call(ajv);
ajv.addSchema(engineSchema);
// The node schema references the engine envelope by a relative uri resolved from its own $id base.
ajv.addSchema(engineSchema, 'https://knowledgeassemble.com/schemas/interactive-engine.schema.json');
let nodeValidator: ValidateFunction | undefined;

function validateNode(input: unknown): boolean {
  nodeValidator ??= ajv.compile(nodeSchema);
  return nodeValidator(input) as boolean;
}

// L1 envelope of each frozen engine representative spec.
const representatives = JSON.parse(readFileSync(ENGINE_REPS_URL, 'utf8')) as Record<string, unknown>;

describe('interactive-lesson-node schema ↔ engine envelope parity', () => {
  it('node schema is valid JSON Schema that references the engine envelope schema', () => {
    expect(nodeSchema.oneOf).toBeDefined();
    expect(nodeSchema.oneOf).toHaveLength(2);
    // single-engine spec branch binds to the shared envelope, not a passthrough object
    expect(JSON.stringify(nodeSchema)).toContain('interactive-engine.schema.json');
  });

  it('every ENGINE_TYPES member has a representative spec that validates inside the node schema', () => {
    for (const engine of ENGINE_TYPES) {
      const spec = representatives[engine];
      expect(spec, `representative spec for engine "${engine}"`).toBeDefined();
      expect(() => validateEnvelope(spec)).not.toThrow();
      expect(validateEnvelope(spec).valid).toBe(true);

      const node = { type: 'interactive', engine, spec };
      expect(validateNode(node), `node for engine "${engine}"`).toBe(true);
    }
  });

  it('node referencing an unknown engine fails validation', () => {
    const spec = representatives.visual;
    expect(validateNode({ type: 'interactive', engine: 'flowchart', spec })).toBe(false);
  });

  it('node with a non-envelope spec fails validation (no additionalProperties passthrough)', () => {
    expect(
      validateNode({ type: 'interactive', engine: 'visual', spec: { notAnEnvelope: true } }),
    ).toBe(false);
  });

  it('node missing the required interactive type fails validation', () => {
    expect(validateNode({ engine: 'visual', spec: representatives.visual })).toBe(false);
  });

  it('composed-lesson fixture (with interactive type) validates against both schemas', () => {
    const fixture = JSON.parse(readFileSync(COMPOSED_FIXTURE_URL, 'utf8')) as Record<string, unknown>;
    const composed = { type: 'interactive', ...fixture };
    expect(validateNode(composed)).toBe(true);
    expect(LessonSchema.safeParse(fixture).success).toBe(true);
  });

  it('composed-lesson fixture carries lesson id (reuses frozen contract)', () => {
    const fixture = JSON.parse(readFileSync(COMPOSED_FIXTURE_URL, 'utf8')) as { id?: string };
    expect(fixture.id).toBe('independence-narrative-demo');
  });

  it('composed-lesson nested engine specs pass L1 and schema', () => {
    const fixture = JSON.parse(readFileSync(COMPOSED_FIXTURE_URL, 'utf8')) as {
      engines: Array<{ instanceId: string; engine: string; spec: unknown }>;
    };
    for (const entry of fixture.engines) {
      const l1 = validateEnvelope(entry.spec);
      expect(l1.valid).toBe(true);
      expect(validateNode({ type: 'interactive', engine: entry.engine, spec: entry.spec })).toBe(true);
    }
  });
});
