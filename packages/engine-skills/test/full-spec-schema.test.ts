import { describe, it, expect } from 'vitest';
import { Ajv } from 'ajv';
import type { Ajv as AjvInstance } from 'ajv';
import addMetaSchema2020Module from 'ajv/dist/refs/json-schema-2020-12/index.js';
import { loadSchema, loadSkillExample } from '../src/manifest.js';

const addMetaSchema2020 = (
  addMetaSchema2020Module as unknown as { default?: (this: AjvInstance) => void }
).default ?? (addMetaSchema2020Module as unknown as (this: AjvInstance) => void);

describe('visual full-spec schema', () => {
  it('validates a full envelope example, not only content', () => {
    const schema = loadSchema('visual') as Record<string, unknown>;
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('content');
    const ajv = new Ajv({ strict: false, allErrors: true });
    addMetaSchema2020.call(ajv);
    const validate = ajv.compile(schema);
    expect(validate(loadSkillExample('visual'))).toBe(true);
  });
});