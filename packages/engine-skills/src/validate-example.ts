import { Ajv } from 'ajv';
import type { Ajv as AjvInstance, ValidateFunction } from 'ajv';
import addMetaSchema2020Module from 'ajv/dist/refs/json-schema-2020-12/index.js';
import { loadSchema, loadSkillExample } from './manifest.js';

const addMetaSchema2020 = (
  addMetaSchema2020Module as unknown as { default?: (this: AjvInstance) => void }
).default ?? (addMetaSchema2020Module as unknown as (this: AjvInstance) => void);

const ajv = new Ajv({ strict: false, allErrors: true });
addMetaSchema2020.call(ajv);

const compiledCache = new Map<string, ValidateFunction>();

function getValidator(type: string): ValidateFunction {
  const cached = compiledCache.get(type);
  if (cached) return cached;
  const schema = loadSchema(type) as Record<string, unknown>;
  const validate = ajv.compile(schema);
  compiledCache.set(type, validate);
  return validate;
}

export function validateSkillExample(type: string): {
  valid: boolean;
  errors: string[];
} {
  return validateSpec(type, loadSkillExample(type));
}

export function validateSpec(type: string, spec: unknown): {
  valid: boolean;
  errors: string[];
} {
  const validate = getValidator(type);
  const valid = validate(spec) as boolean;
  if (valid) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: (validate.errors ?? []).map(
      (e: { instancePath: string; message?: string }) => `${e.instancePath} ${e.message ?? ''}`,
    ),
  };
}