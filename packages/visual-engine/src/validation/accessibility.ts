import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { VisualSpec } from '../schema.js';

export function validateAccessibility(spec: VisualSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!spec.accessibility?.label) {
    issues.push({ level: 'L4', code: 'ACCESSIBILITY_ERROR', message: 'envelope accessibility.label is required' });
  }

  if (spec.content?.elements) {
    for (const elem of spec.content.elements) {
      if (elem.interactive && !elem.role) {
        issues.push({ level: 'L4', code: 'ACCESSIBILITY_ERROR', message: `interactive element "${elem.id}" has no semantic role` });
      }
    }
  }

  if (spec.content?.highlight && spec.content.highlight.length > 0 && !spec.accessibility?.description) {
    issues.push({ level: 'L4', code: 'ACCESSIBILITY_ERROR', message: 'highlighted markers present but no accessibility description provided' });
  }

  return { valid: issues.length === 0, issues };
}