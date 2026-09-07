import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { TimelineSpec } from '../schema.js';
import { validateTemporal } from './temporal.js';

export function validateSemantic(spec: TimelineSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const content = spec.content;

  if (!content) {
    return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content is required' }] };
  }

  const kind = content.kind;
  if (!kind) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'content.kind is required' });
  } else if (kind !== 'events') {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown content.kind "${kind}"` });
  }

  const events = content.events ?? [];
  const ids = new Set<string>();
  for (const [i, event] of events.entries()) {
    if (!event.id) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: event at index ${i} has no id` });
    } else {
      if (ids.has(event.id)) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: duplicate event id "${event.id}"` });
      }
      ids.add(event.id);
    }
  }

  if (content.periods) {
    for (const [i, period] of content.periods.entries()) {
      if (!period.id) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: period at index ${i} has no id` });
      } else {
        if (ids.has(period.id)) {
          issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: duplicate period id "${period.id}"` });
        }
        ids.add(period.id);
      }
    }
  }

  if (content.tracks) {
    for (const [i, track] of content.tracks.entries()) {
      if (!track.id) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: track at index ${i} has no id` });
      } else {
        if (ids.has(track.id)) {
          issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `timeline: duplicate track id "${track.id}"` });
        }
        ids.add(track.id);
        for (const eventId of track.events) {
          if (!ids.has(eventId) && !events.some((e) => e.id === eventId)) {
            issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `timeline: track "${track.id}" references unknown event "${eventId}"` });
          }
        }
      }
    }
  }

  const temporalIssues = validateTemporal(content);
  for (const ti of temporalIssues) {
    issues.push(ti);
  }

  const actions = spec.interaction?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!(ACTION_TYPES as readonly string[]).includes(action)) {
        issues.push({ level: 'L2', code: 'INVALID_ACTION', message: `interaction.actions contains non-D5 action "${action}"` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}