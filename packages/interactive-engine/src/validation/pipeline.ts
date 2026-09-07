import type { ErrorCode } from '../core/errors.js';
import type { EngineSpec } from '../schemas/envelope.js';

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
