import type { ValidationIssue } from '@knowledgeassemble/interactive-engine';
import { DATE_GRAMMAR } from '../schema.js';
import { parseDate } from '../layout/time.js';

export function validateTemporal(content: {
  events?: Array<{ date: string }>;
  periods?: Array<{ from: string; to: string }>;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (content.events) {
    for (const [i, event] of content.events.entries()) {
      if (!DATE_GRAMMAR.test(event.date)) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: event at index ${i} has invalid date "${event.date}" (must match Timeline-D3 grammar)`,
        });
      }
    }
  }

  if (content.periods) {
    for (const [i, period] of content.periods.entries()) {
      if (!DATE_GRAMMAR.test(period.from)) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: period at index ${i} has invalid from "${period.from}"`,
        });
      }
      if (!DATE_GRAMMAR.test(period.to)) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: period at index ${i} has invalid to "${period.to}"`,
        });
      }
      if (DATE_GRAMMAR.test(period.from) && DATE_GRAMMAR.test(period.to)) {
        const fromDay = parseDate(period.from);
        const toDay = parseDate(period.to);
        if (fromDay > toDay) {
          issues.push({
            level: 'L2' as const,
            code: 'INVALID_ENTITY',
            message: `timeline: period at index ${i} has from > to ("${period.from}" > "${period.to}")`,
          });
        }
      }
    }
  }

  return issues;
}