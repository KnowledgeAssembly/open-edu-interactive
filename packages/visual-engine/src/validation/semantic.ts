import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import { VISUAL_KINDS } from '../schema.js';
import type { VisualSpec } from '../schema.js';

export function validateSemantic(spec: VisualSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  const kind = spec.content?.kind;
  if (!kind) {
    return {
      valid: false,
      issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content.kind is required' }],
    };
  }

  if (!(VISUAL_KINDS as readonly string[]).includes(kind)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown content.kind "${kind}"` });
  }

  const allIds = new Set<string>();
  if (spec.content?.elements) {
    for (const elem of spec.content.elements) {
      allIds.add(elem.id);
    }
  }
  if (spec.content?.components) {
    for (const comp of spec.content.components) {
      allIds.add(comp.id);
    }
  }
  if (spec.content?.entities) {
    for (const entity of spec.content.entities) {
      allIds.add(entity.id);
    }
  }

  if (spec.content?.relationships) {
    for (const rel of spec.content.relationships) {
      if (!allIds.has(rel.source)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `relationship source "${rel.source}" not found` });
      }
      if (!allIds.has(rel.target)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `relationship target "${rel.target}" not found` });
      }
    }
  }

  const d5Set = new Set(ACTION_TYPES);
  if (spec.content?.elements) {
    for (const elem of spec.content.elements) {
      if (elem.acceptsActions) {
        for (const action of elem.acceptsActions) {
          if (!d5Set.has(action as typeof ACTION_TYPES[number])) {
            issues.push({ level: 'L2', code: 'INVALID_ACTION', message: `entity "${elem.id}" accepts invalid action "${action}"` });
          }
        }
      }
    }
  }

  if (kind === 'number-line') {
    const range = spec.content?.range;
    if (range) {
      if (range.max <= range.min) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'number-line: max must be greater than min' });
      }
      if (range.step <= 0) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'number-line: step must be positive' });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}