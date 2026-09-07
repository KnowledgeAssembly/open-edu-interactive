import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  type EngineAction,
  type EngineEvent,
} from '../src/index.js';
import { Lesson } from '../src/composition/lesson.js';
import { makeHost, makeRegistry } from './helpers/composition-stubs.js';

const FIXTURE_URL = new URL('../../../docs/fixtures/composition/narrative-timeline-visual.json', import.meta.url);
const canonicalFixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as {
  id: string;
  engines: Array<{
    instanceId: string;
    engine: string;
    spec: { type: string; version: string; id: string; content: { kind: string; events?: Array<{ id: string; label: string; date: string; links?: Record<string, string> }>; entities?: Array<{ id: string; label: string }> } };
  }>;
  bindings: Array<{ on: string; from: string; dispatch: { to: string; action: string; targetIdFrom: string } }>;
};

describe('Lesson (composition runtime)', () => {
  it('load(canonicalFixture) validates', () => {
    const lesson = Lesson.load(canonicalFixture as never, makeRegistry());
    expect(lesson).toBeInstanceOf(Lesson);
  });

  it('select on timeline instances routes focus to the visual instance', () => {
    const registry = makeRegistry();
    const lesson = Lesson.load(canonicalFixture as never, registry);
    const { host } = makeHost();
    const runtime = lesson.start(host);

    runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);

    const visualSnapshot = runtime.snapshot('visual-independence') as { focus: string | null };
    expect(visualSnapshot.focus).toBe('figure-independence');

    const eventNames = runtime.events().map((e) => e.name);
    const tIdx = eventNames.indexOf('timeline.event-selected');
    const vIdx = eventNames.indexOf('visual.figure-independence-focused');
    expect(tIdx).toBeGreaterThan(0);
    expect(vIdx).toBeGreaterThan(tIdx);

    const selected = runtime.events().find((e) => e.name === 'timeline.event-selected');
    const payload = selected?.action?.payload as { links?: { visualEntityId?: string }; id?: string };
    expect(payload.id).toBe('event-1947');
    expect(payload.links?.visualEntityId).toBe('figure-independence');
    runtime.stop();
  });

  it('EventLog replay from the host stream reproduces the same final snapshot', () => {
    const registry = makeRegistry();
    const lesson = Lesson.load(canonicalFixture as never, registry);

    const run = (): { snapshot: string; log: readonly EngineEvent[] } => {
      const { host } = makeHost();
      const runtime = lesson.start(host);
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
      const visual = runtime.snapshot('visual-independence') as { focus: string | null; selection: string[] };
      const events = runtime.events();
      runtime.stop();
      return { snapshot: JSON.stringify({ focus: visual.focus, selection: visual.selection }), log: events };
    };

    const first = run();
    const second = run();
    expect(first.snapshot).toBe(second.snapshot);
    expect(first.log.map((e) => e.name)).toEqual(second.log.map((e) => e.name));
  });

  it('rejects a lesson whose engines[].engine !== spec.type with INVALID_SPEC', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.engines[0] as { engine: string }).engine = 'visual';
    let caught: EngineError | null = null;
    try {
      Lesson.load(bad as never, makeRegistry());
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_SPEC');
  });

  it('rejects an unknown binding target instance with INVALID_REFERENCE', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { to: string } }).dispatch.to = 'no-such-instance';
    let caught: EngineError | null = null;
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
  });

  it('rejects an unresolved targetIdFrom with INVALID_REFERENCE', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { targetIdFrom: string } }).dispatch.targetIdFrom = 'links.missingField';
    let caught: EngineError | null = null;
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      const runtime = lesson.start(makeHost().host);
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
  });

  it('unknown from instance on the binding rejects at start', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { from: string }).from = 'no-such-instance';
    let caught: EngineError | null = null;
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
  });
});