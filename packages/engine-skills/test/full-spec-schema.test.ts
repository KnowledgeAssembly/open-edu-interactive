import { describe, it, expect } from 'vitest';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { Ajv as AjvInstance } from 'ajv';
import addFormatsModule from 'ajv-formats';
import { loadSchema, loadSkillExample } from '../src/manifest.js';

const addFormats = (
  addFormatsModule as unknown as { default?: (ajv: AjvInstance) => void }
).default ?? (addFormatsModule as unknown as (ajv: AjvInstance) => void);

describe('visual full-spec schema', () => {
  it('validates a full envelope example, not only content', () => {
    const schema = loadSchema('visual') as Record<string, unknown>;
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('content');
    const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(loadSkillExample('visual'))).toBe(true);
  });
});