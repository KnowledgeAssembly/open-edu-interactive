import type { ErrorCode } from '../core/errors.js';
import { EnvelopeSchema } from '../schemas/envelope.zod.js';
import type { ValidationIssue, ValidationResult } from './pipeline.js';

function codeFor(path: (string | number)[]): ErrorCode {
  const first = path[0];
  if (first === 'version') return 'INVALID_VERSION';
  const referencesId = path.some((segment) => segment === 'id');
  if (first === 'id' || referencesId) return 'INVALID_REFERENCE';
  return 'INVALID_SPEC';
}

function formatPath(path: (string | number)[]): string {
  return path.map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment)).join('.');
}

export function validateEnvelope(input: unknown): ValidationResult {
  const result = EnvelopeSchema.safeParse(input);
  if (result.success) {
    return { valid: true, issues: [] };
  }
  const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
    level: 'L1',
    code: codeFor(issue.path),
    message: issue.message,
    path: formatPath(issue.path),
  }));
  return { valid: false, issues };
}
