import { describe, expect, it } from 'vitest';
import {
  TimelineEventSchema,
  TimelinePeriodSchema,
  TimelineTrackSchema,
  TimelineContentSchema,
  DATE_GRAMMAR,
  SOURCE_CLASSES,
} from '../src/schema.js';

describe('schema-parity', () => {
  it('DATE_GRAMMAR matches Timeline-D3', () => {
    expect(DATE_GRAMMAR.source).toBe('^[+-]?\\d{1,6}(-\\d{2}){0,2}$');
  });

  it('DATE_GRAMMAR accepts valid dates', () => {
    const valid = ['1857', '1947-08-15', '-500', '1', '100000', '2026-09', '2026-09-08', '+100'];
    for (const d of valid) {
      expect(DATE_GRAMMAR.test(d), `expected "${d}" to match`).toBe(true);
    }
  });

  it('DATE_GRAMMAR rejects invalid dates', () => {
    const invalid = ['yesterday', 'not-a-date', '', 'a', '1234567', '2026-0', '2026-'];
    for (const d of invalid) {
      expect(DATE_GRAMMAR.test(d), `expected "${d}" to NOT match`).toBe(false);
    }
  });

  it('content.kind.enum equals ["events"]', () => {
    const result = TimelineContentSchema.shape.kind;
    expect(result.parse('events')).toBe('events');
    expect(() => result.parse('tracks')).toThrow();
    expect(() => result.parse('periods')).toThrow();
  });

  it('events[] has additionalProperties:false', () => {
    const result = TimelineEventSchema.safeParse({ id: 'e1', label: 'a', date: '1900', unknownProp: 1 });
    expect(result.success).toBe(false);
  });

  it('periods[] has additionalProperties:false', () => {
    const result = TimelinePeriodSchema.safeParse({ id: 'p1', label: 'a', from: '1900', to: '1910', unknownProp: 1 });
    expect(result.success).toBe(false);
  });

  it('tracks[] has additionalProperties:false', () => {
    const result = TimelineTrackSchema.safeParse({ id: 't1', label: 'a', events: ['e1'], unknownProp: 1 });
    expect(result.success).toBe(false);
  });

  it('content has additionalProperties:false', () => {
    const result = TimelineContentSchema.safeParse({ kind: 'events', events: [{ id: 'e1', label: 'a', date: '1900' }], unknownProp: 1 });
    expect(result.success).toBe(false);
  });

  it('SOURCE_CLASSES matches DESIGN §9', () => {
    expect(SOURCE_CLASSES).toEqual(['authoritative', 'illustrative', 'simulated']);
  });

  it('rejects kind:"tracks" (Timeline-D1)', () => {
    const result = TimelineContentSchema.safeParse({ kind: 'tracks', events: [] });
    expect(result.success).toBe(false);
  });

  it('events is required and must contain at least one event (docs minItems:1)', () => {
    const empty = TimelineContentSchema.safeParse({ kind: 'events', events: [] });
    expect(empty.success).toBe(false);
    const missing = TimelineContentSchema.safeParse({ kind: 'events' });
    expect(missing.success).toBe(false);
  });
});