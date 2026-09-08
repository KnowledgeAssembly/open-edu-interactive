import { describe, expect, it } from 'vitest';
import {
  EngineError,
  EngineRegistry,
  type EngineHost,
  type EngineEvent,
  type EngineSpec,
} from '@knowledgeassemble/interactive-engine';
import { TimelineEngine } from '../src/engine.js';
import { TIMELINE_EVENT_SELECTED, TIMELINE_EVENT_FOCUSED } from '../src/schema.js';

const INDEPENDENCE_SPEC: EngineSpec = {
  type: 'timeline',
  version: '1.0.0',
  id: 'timeline-independence',
  metadata: { title: 'Indian independence — key events' },
  content: {
    kind: 'events',
    events: [
      { id: 'event-1857', label: '1857 uprising', date: '1857' },
      { id: 'event-1919', label: 'Jallianwala Bagh', date: '1919-04-13' },
      { id: 'event-1947', label: 'Independence', date: '1947-08-15', links: { visualEntityId: 'figure-independence' } },
    ],
    periods: [{ id: 'period-company', label: 'Company rule', from: '1757', to: '1858', style: { role: 'secondary-period' } }],
    tracks: [
      { id: 'track-movement', label: 'National movement', events: ['event-1857', 'event-1947'] },
      { id: 'track-reform', label: 'Constitutional reform', events: ['event-1919'] },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'deselect', 'focus', 'play-pause', 'step', 'scrub', 'reset'] },
  questions: [],
  sources: [{ class: 'authoritative' }],
  accessibility: { label: 'Timeline of Indian independence' },
} as unknown as EngineSpec;

function makeHost(): { host: EngineHost; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const host: EngineHost = {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => undefined,
    onEvent: (event) => { events.push(structuredClone(event)); },
    resolveAsset: (id) => id,
  };
  return { host, events };
}

describe('TimelineEngine — instance (upgraded)', () => {
  it('TimelineEngine validates and instantiates', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'test');
    expect(instance.id).toBe('test');
  });

  it('select emits timeline.event-selected with full event record + links', () => {
    const { host, events } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    instance.dispatch({ type: 'select', target: { id: 'event-1947' } });
    const selected = events.find((e) => e.name === TIMELINE_EVENT_SELECTED);
    expect(selected).toBeDefined();
    expect(selected?.action?.target?.id).toBe('event-1947');
    const payload = selected?.action?.payload as Record<string, unknown> | undefined;
    expect(payload?.links).toBeDefined();
    expect((payload?.links as Record<string, string>).visualEntityId).toBe('figure-independence');
  });

  it('focus emits timeline.event-focused with full event record', () => {
    const { host, events } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    instance.dispatch({ type: 'focus', target: { id: 'event-1857' } });
    const focused = events.find((e) => e.name === TIMELINE_EVENT_FOCUSED);
    expect(focused).toBeDefined();
    expect(focused?.action?.target?.id).toBe('event-1857');
  });

  it('play-pause toggles snapshot().playback', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    const snap1 = instance.snapshot() as { playback: string };
    expect(snap1.playback).toBe('stopped');
    instance.dispatch({ type: 'play-pause' });
    const snap2 = instance.snapshot() as { playback: string };
    expect(snap2.playback).toBe('playing');
  });

  it('step advances snapshot().step', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    const snap0 = instance.snapshot() as { step: number };
    expect(snap0.step).toBe(0);
    instance.dispatch({ type: 'step' });
    const snap1 = instance.snapshot() as { step: number };
    expect(snap1.step).toBe(1);
  });

  it('scrub jumps step to target event index', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    instance.dispatch({ type: 'scrub', target: { id: 'event-1947' } });
    const snap = instance.snapshot() as { step: number };
    expect(snap.step).toBe(2);
  });

  it('unknown scrub target throws INVALID_ENTITY', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    expect(() => instance.dispatch({ type: 'scrub', target: { id: 'unknown' } })).toThrow(EngineError);
    try {
      instance.dispatch({ type: 'scrub', target: { id: 'unknown' } });
    } catch (e) {
      expect((e as EngineError).code).toBe('INVALID_ENTITY');
    }
  });

  it('reset clears step and playback', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    instance.dispatch({ type: 'play-pause' });
    instance.dispatch({ type: 'step' });
    instance.dispatch({ type: 'reset' });
    const snap = instance.snapshot() as { step: number; playback: string };
    expect(snap.step).toBe(0);
    expect(snap.playback).toBe('stopped');
  });

  it('EngineRegistry.get("timeline") returns the real engine', () => {
    const registry = new EngineRegistry();
    registry.register(new TimelineEngine());
    expect(registry.get('timeline')).toBeInstanceOf(TimelineEngine);
  });

  it('snapshot contains scene, svgResult, linear', () => {
    const { host } = makeHost();
    const instance = new TimelineEngine().instantiate(INDEPENDENCE_SPEC, host, 'tl');
    const snap = instance.snapshot() as Record<string, unknown>;
    expect(snap).toHaveProperty('scene');
    expect(snap).toHaveProperty('svgResult');
    expect(snap).toHaveProperty('linear');
  });
});