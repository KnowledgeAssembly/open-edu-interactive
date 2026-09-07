import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { ChartSpec } from '../schema.js';

export function validateAccessibility(spec: ChartSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  if (!spec.accessibility?.label) {
    issues.push({
      level: 'L4',
      code: 'ACCESSIBILITY_ERROR',
      message: 'accessibility.label is required',
    });
  }
  return { valid: issues.length === 0, issues };
}