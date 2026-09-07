import { describe, expect, it } from 'vitest';
import {
  EngineError,
  EngineRegistry,
  validateEnvelope,
  type EngineHost,
  type EngineEvent,
  type EngineSpec,
} from '@knowledgeassemble/interactive-engine';
import { TimelineEngine } from '../src/engine.js';
import { TIMELINE_EVENT_SELECTED } from '../src/schema.js';

const TIMELINE_SPEC: EngineSpec = {
  type: 'timeline',
  version: '1.0.0',
  id: 'timeline-independence',
  metadata: { title: 'Indian independence — key events' },
  content: {
    kind: 'events',
    events: [
      { id: 'event-1857', label: '1857 uprising', date: '1857' },
      {
        id: 'event-1947',
        label: 'Independence',
        date: '1947-08-15',
        links: { visualEntityId: 'figure-independence' },
      },
    ],
  },
  interaction: {
    mode: 'explore',
    actions: ['select', 'focus', 'play-pause', 'step', 'reset'],
  },
  questions: [],
} as unknown as EngineSpec;

function makeHost(): { host: EngineHost; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const host: EngineHost = {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => undefined,
    onEvent: (event) => {
      events.push(structuredClone(event));
    },
    resolveAsset: (id) => id,
  };
  return { host, events };
}

describe('TimelineEngine', () => {
  it('validates the canonical timeline spec against L1 (envelope)', () => {
    const result = validateEnvelope(TIMELINE_SPEC);
    expect(result.valid).toBe(true);
  });

  it('selecting an event emits timeline.event-selected carrying links.visualEntityId', () => {
    const { host, events } = makeHost();
    const instance = new TimelineEngine().instantiate(TIMELINE_SPEC, host, 'timeline-independence');

    instance.dispatch({ type: 'select', target: { id: 'event-1947' } });

    const selected = events.find((e) => e.name === TIMELINE_EVENT_SELECTED);
    expect(selected).toBeDefined();
    expect(selected?.action?.target?.id).toBe('event-1947');
    const payload = selected?.action?.payload as { id: string; links?: { visualEntityId?: string } };
    expect(payload).toBeDefined();
    expect(payload.id).toBe('event-1947');
    expect(payload.links?.visualEntityId).toBe('figure-independence');

    const snapshot = instance.snapshot() as { selection: string[] };
    expect(snapshot.selection).toContain('event-1947');
  });

  it('does not emit timeline.event-selected for play-pause or step', () => {
    const { events } = makeHost();
    const engine = new TimelineEngine();
    const instance = engine.instantiate(TIMELINE_SPEC, makeHost().host, 'timeline-x');
    const host2 = makeHost();
    const instance2 = engine.instantiate(TIMELINE_SPEC, host2.host, 'timeline-y');

    instance.dispatch({ type: 'play-pause' });
    instance.dispatch({ type: 'step' });
    instance2.dispatch({ type: 'focus', target: { id: 'event-1857' } });

    const names = events
      .concat(host2.events)
      .map((e) => e.name)
      .filter((n) => n === TIMELINE_EVENT_SELECTED);
    expect(names).toEqual([]);
  });

  it('selecting an unknown event id raises INVALID_ENTITY', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(TIMELINE_SPEC, host, 'timeline-independence');
    let caught: EngineError | null = null;
    try {
      instance.dispatch({ type: 'select', target: { id: 'event-1900' } });
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_ENTITY');
  });

  it('scrub is UNSUPPORTED_ACTION at P2.5', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(TIMELINE_SPEC, host, 'timeline-independence');
    let caught: EngineError | null = null;
    try {
      instance.dispatch({ type: 'scrub', target: { id: 'event-1857' } });
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('UNSUPPORTED_ACTION');
  });

  it('EngineRegistry.get("timeline") returns the stub after registration', () => {
    const registry = new EngineRegistry();
    registry.register(new TimelineEngine());
    expect(registry.get('timeline')).toBeInstanceOf(TimelineEngine);
  });

  it('rejects a spec with a duplicate event id (L2)', () => {
    const dup = {
      ...TIMELINE_SPEC,
      id: 'timeline-dup',
      content: {
        kind: 'events',
        events: [
          { id: 'e1', label: 'a', date: '1900' },
          { id: 'e1', label: 'b', date: '1901' },
        ],
      },
    };
    const result = new TimelineEngine().validate(dup as unknown as EngineSpec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('INVALID_ENTITY');
  });

  it('rejects an unknown content.kind (L2)', () => {
    const bad = {
      ...TIMELINE_SPEC,
      id: 'timeline-bad',
      content: { kind: 'periods' },
    };
    const result = new TimelineEngine().validate(bad as unknown as EngineSpec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('INVALID_ENTITY');
  });

  it('teardown sets phase to torn-down', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(TIMELINE_SPEC, host, 'timeline-x');
    instance.teardown();
    expect((instance.snapshot() as { phase: string }).phase).toBe('torn-down');
  });
});
