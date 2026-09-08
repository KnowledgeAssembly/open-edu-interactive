import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { TimelineSpec } from '../schema.js';
import { TimelineContentSchema } from '../schema.js';
import { validateTemporal } from './temporal.js';

export function validateSemantic(spec: TimelineSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!Array.isArray(spec.sources) || spec.sources.length === 0) {
    issues.push({
      level: 'L2',
      code: 'INVALID_SPEC',
      message: 'sources[] is required; every factual claim must carry a provenance source (DESIGN §9)',
    });
  }

  const content = spec.content;
  if (!content) {
    return { valid: false, issues: [...issues, { level: 'L2', code: 'INVALID_SPEC', message: 'content is required' }] };
  }

  const parsed = TimelineContentSchema.safeParse(content);
  if (!parsed.success) {
    issues.push({
      level: 'L2',
      code: 'INVALID_SPEC',
      message: `timeline content failed schema validation: ${parsed.error.issues
        .map((i) => `content.${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    });
    return { valid: false, issues };
  }

  const namespace = new Map<string, string>();
  for (const event of content.events) {
    const owner = namespace.get(event.id);
    if (owner) {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: `timeline: node id "${event.id}" is ambiguous — it is both a ${owner} and an event-marker`,
      });
    } else {
      namespace.set(event.id, 'event-marker');
    }
  }

  const claimPrefixed = (ids: string[] | undefined, id: (i: string) => string, what: string): void => {
    for (const raw of ids ?? []) {
      const full = id(raw);
      const owner = namespace.get(full);
      if (owner) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `timeline: node id "${full}" is ambiguous — it is both a ${owner} and a ${what}`,
        });
      } else {
        namespace.set(full, what);
      }
    }
  };
  claimPrefixed(content.periods?.map((p) => p.id), (id) => `period-${id}`, 'period-band');
  claimPrefixed(content.tracks?.map((t) => t.id), (id) => `track-${id}`, 'track-lane');

  const owner = namespace.get('track-track-default');
  if (owner) {
    issues.push({
      level: 'L2',
      code: 'INVALID_ENTITY',
      message: `timeline: node id "track-track-default" is ambiguous — it is both a ${owner} and the default track-lane`,
    });
  }

  for (const track of content.tracks ?? []) {
    if (track.id === 'track-default') {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: 'timeline: track id "track-default" is reserved for the implicit default lane',
      });
    }
  }

  const trackByEvent = new Map<string, string>();
  for (const track of content.tracks ?? []) {
    for (const eventId of track.events) {
      const ownerTrack = trackByEvent.get(eventId);
      if (ownerTrack) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `timeline: event "${eventId}" belongs to multiple tracks ("${ownerTrack}" and "${track.id}")`,
        });
      } else {
        trackByEvent.set(eventId, track.id);
      }
    }
  }

  for (const track of content.tracks ?? []) {
    for (const eventId of track.events) {
      if (!content.events.some((e) => e.id === eventId)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_REFERENCE',
          message: `timeline: track "${track.id}" references unknown event "${eventId}"`,
        });
      }
    }
  }

  for (const event of content.events) {
    if (!event.trackId) continue;
    const declared = (content.tracks ?? []).find((t) => t.id === event.trackId);
    if (!declared) {
      issues.push({
        level: 'L2',
        code: 'INVALID_REFERENCE',
        message: `timeline: event "${event.id}" references unknown track "${event.trackId}"`,
      });
    } else if (!declared.events.includes(event.id)) {
      trackByEvent.set(event.id, event.trackId);
    }
  }

  for (const ti of validateTemporal(content)) {
    issues.push(ti);
  }

  const actions = spec.interaction?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!(ACTION_TYPES as readonly string[]).includes(action)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ACTION',
          message: `interaction.actions contains non-D5 action "${action}"`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}