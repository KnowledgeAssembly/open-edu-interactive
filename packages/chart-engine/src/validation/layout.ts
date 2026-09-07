import type { ValidationResult } from '@knowledgeassemble/interactive-engine';

export function validateLayout(): ValidationResult {
  return { valid: true, issues: [] };
}