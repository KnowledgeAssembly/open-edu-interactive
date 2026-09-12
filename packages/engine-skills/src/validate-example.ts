import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { Ajv as AjvInstance, ValidateFunction } from 'ajv';
import addFormatsModule from 'ajv-formats';
import { loadSchema, loadSkillExample } from './manifest.js';

const addFormats = (
  addFormatsModule as unknown as { default?: (ajv: AjvInstance) => void }
).default ?? (addFormatsModule as unknown as (ajv: AjvInstance) => void);

const ajv2020 = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
const ajvDraft7 = new Ajv({ strict: true, strictRequired: false, allErrors: true });
addFormats(ajv2020);
addFormats(ajvDraft7);

const compiledCache = new Map<string, ValidateFunction>();

function getValidator(type: string): ValidateFunction {
  const cached = compiledCache.get(type);
  if (cached) return cached;
  const schema = loadSchema(type) as Record<string, unknown>;
  const isDraft7 = String(schema.$schema ?? '').includes('json-schema.org/draft-07');
  const validate = (isDraft7 ? ajvDraft7 : ajv2020).compile(
    schema,
  ) as ValidateFunction;
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