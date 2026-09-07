import type { ErrorCode } from '../core/errors.js';
import type { EngineSpec } from '../schemas/envelope.js';
import { validateEnvelope } from './validate.js';

export type ValidationLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface ValidationIssue {
  level: ValidationLevel;
  code: ErrorCode;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationHooks {
  semantic?: (spec: EngineSpec) => ValidationResult;
  layout?: (spec: EngineSpec) => ValidationResult;
  accessibility?: (spec: EngineSpec) => ValidationResult;
}

function merge(...results: ValidationResult[]): ValidationResult {
  return {
    valid: results.every((r) => r.valid),
    issues: results.flatMap((r) => r.issues),
  };
}

export function runPipeline(input: unknown, hooks?: ValidationHooks): ValidationResult {
  const l1 = validateEnvelope(input);
  if (!l1.valid) {
    return l1;
  }
  const spec = input as EngineSpec;
  const semantic = hooks?.semantic ? hooks.semantic(spec) : { valid: true, issues: [] };
  if (!semantic.valid) {
    return merge(l1, semantic);
  }
  const layout = hooks?.layout ? hooks.layout(spec) : { valid: true, issues: [] };
  if (!layout.valid) {
    return merge(l1, semantic, layout);
  }
  const accessibility = hooks?.accessibility
    ? hooks.accessibility(spec)
    : { valid: true, issues: [] };
  return merge(l1, semantic, layout, accessibility);
}
