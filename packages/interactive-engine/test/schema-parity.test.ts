import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION_TYPES } from '../src/schemas/actions.js';
import { EnvelopeSchema } from '../src/schemas/envelope.zod.js';

const SCHEMA_URL = new URL('../src/schemas/interactive-engine.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
  additionalProperties?: boolean;
  required: string[];
  $defs: {
    actionType: { enum: string[] };
    purpose: { required: string[] };
  };
};

const CANONICAL = {
  type: 'visual',
  version: '2.1.0',
  id: 'number-line-02',
  metadata: { author: 'openedu-agent' },
  purpose: {
    learningObjective: 'Estimate where fractions sit between 0 and 1',
    interactionGoal: 'Place or select a value on the number line',
    reasoningMode: 'estimate',
  },
  content: {},
  layout: {},
  interaction: {},
  questions: [],
};

function parse(value: unknown) {
  return EnvelopeSchema.safeParse(value);
}

describe('schema parity guardrail', () => {
  it('JSON Schema actionType enum matches ACTION_TYPES', () => {
    expect([...schema.$defs.actionType.enum].sort()).toEqual([...ACTION_TYPES].sort());
  });

  it('JSON Schema purpose.required is exactly learningObjective', () => {
    expect(schema.$defs.purpose.required).toEqual(['learningObjective']);
  });

  it('JSON Schema top-level required is type/version/id', () => {
    expect(schema.required).toEqual(['type', 'version', 'id']);
  });

  it('JSON Schema forbids unknown top-level keys', () => {
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('EnvelopeSchema', () => {
  it('parses the DESIGN canonical example', () => {
    expect(parse(CANONICAL).success).toBe(true);
  });

  it('rejects an unknown top-level key', () => {
    expect(parse({ ...CANONICAL, skill: 'x' }).success).toBe(false);
  });

  it('rejects purpose.skill', () => {
    expect(parse({ ...CANONICAL, purpose: { ...CANONICAL.purpose, skill: 'x' } }).success).toBe(
      false,
    );
  });

  it('rejects a superseded highlight action', () => {
    expect(parse({ ...CANONICAL, interaction: { actions: ['select', 'highlight'] } }).success).toBe(
      false,
    );
  });

  it('rejects a non-semver version', () => {
    expect(parse({ ...CANONICAL, version: '2.1' }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    const rest: Record<string, unknown> = { ...CANONICAL };
    delete rest.id;
    expect(parse(rest).success).toBe(false);
  });
});
