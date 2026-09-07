import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  EngineRegistry,
  EventLog,
  initialState,
  type Engine,
  type EngineAction,
  type EngineEvent,
  type EngineHost,
  type EngineInstance,
  type EngineSpec,
  type EngineState,
  type EngineType,
  type ValidationResult,
} from '../src/index.js';
import { Lesson } from '../src/composition/lesson.js';

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

function makeHost(): { host: EngineHost; events: Array<{ seq: number; name: string; instanceId: string } & EngineEvent> } {
  const events: Array<{ seq: number; name: string; instanceId: string } & EngineEvent> = [];
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

class StubTimelineEngine implements Engine {
  readonly type: EngineType = 'timeline';

  validate(spec: EngineSpec): ValidationResult {
    const events = (spec.content as { events?: unknown[] })?.events ?? [];
    const ids = new Set<string>();
    for (const entry of events) {
      const id = (entry as { id: string }).id;
      if (ids.has(id)) {
        return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate "${id}"` }] };
      }
      ids.add(id);
    }
    return { valid: true, issues: [] };
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const instanceId = id ?? spec.id;
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();
    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    function emit(event: EngineEvent): void {
      host.onEvent(event);
      for (const listener of listeners) listener(event);
    }

    const mounted = log.append('engine-mounted', instanceId);
    const ready = log.append('engine-ready', instanceId);
    emit(mounted as EngineEvent);
    emit(ready as EngineEvent);

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        let entity: { id: string; label: string; date: string; links?: Record<string, string> } | undefined;
        if (action.type === 'select') {
          entity = ((spec.content as { events: Array<{ id: string; label: string; date: string; links?: Record<string, string> }> }).events ?? []).find(
            (e) => e.id === action.target?.id,
          );
          if (!entity) throw new EngineError('INVALID_ENTITY', `unknown event "${action.target?.id}"`);
        }
        if (action.type === 'scrub') {
          throw new EngineError('UNSUPPORTED_ACTION', 'scrub unsupported');
        }

        const selection = action.type === 'select' && entity ? [...new Set([...state.selection, entity.id])] : state.selection;
        state = { ...state, selection, lastAction: action };

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as EngineEvent);
        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as EngineEvent);

        if (action.type === 'select' && entity) {
          const ns = log.append('timeline.event-selected', instanceId, entity as unknown as Record<string, unknown>, {
            ...action,
            payload: entity,
          });
          emit(ns as EngineEvent);
        }

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as EngineEvent);
      },
      snapshot() {
        return { ...state, events: (spec.content as { events?: unknown[] }).events ?? [] };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      teardown(): void {
        listeners.clear();
      },
    };
  }
}

class StubVisualEngine implements Engine {
  readonly type: EngineType = 'visual';

  validate() {
    return { valid: true, issues: [] };
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const instanceId = id ?? spec.id;
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();
    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    function emit(event: EngineEvent): void {
      host.onEvent(event);
      for (const listener of listeners) listener(event);
    }

    const mounted = log.append('engine-mounted', instanceId);
    const ready = log.append('engine-ready', instanceId);
    emit(mounted as EngineEvent);
    emit(ready as EngineEvent);

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        if (action.type === 'focus') state = { ...state, focus: action.target?.id ?? null, lastAction: action };
        else state = { ...state, lastAction: action };

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as EngineEvent);
        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as EngineEvent);

        const suffix =
          action.type === 'focus' ? 'focused' : action.type === 'select' ? 'selected' : action.type;
        const evtName = `visual.${action.target?.id ?? 'unknown'}-${suffix}`;
        const ns = log.append(evtName, instanceId, { selection: state.selection }, action);
        emit(ns as EngineEvent);

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as EngineEvent);
      },
      snapshot() {
        return { ...state };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      teardown(): void {
        listeners.clear();
      },
    };
  }
}

function makeRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new StubTimelineEngine());
  registry.register(new StubVisualEngine());
  return registry;
}

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
    try {
      Lesson.load(bad as never, makeRegistry());
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INVALID_SPEC');
    }
  });

  it('rejects an unknown binding target instance with INVALID_REFERENCE', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { to: string } }).dispatch.to = 'no-such-instance';
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INVALID_REFERENCE');
    }
  });

  it('rejects an unresolved targetIdFrom with INVALID_REFERENCE', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { targetIdFrom: string } }).dispatch.targetIdFrom = 'links.missingField';
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      const runtime = lesson.start(makeHost().host);
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INVALID_REFERENCE');
    }
  });

  it('unknown from instance on the binding rejects at start', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { from: string }).from = 'no-such-instance';
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EngineError;
      expect(err.code).toBe('INVALID_REFERENCE');
    }
  });
});