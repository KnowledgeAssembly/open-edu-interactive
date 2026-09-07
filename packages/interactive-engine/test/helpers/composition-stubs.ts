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
} from '../../src/index.js';

export function makeHost(): {
  host: EngineHost;
  events: Array<{ seq: number; name: string; instanceId: string } & EngineEvent>;
} {
  const events: Array<{ seq: number; name: string; instanceId: string } & EngineEvent> = [];
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

export class StubTimelineEngine implements Engine {
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
          entity = (
            (spec.content as { events: Array<{ id: string; label: string; date: string; links?: Record<string, string> }> }).events ?? []
          ).find((e) => e.id === action.target?.id);
          if (!entity) throw new EngineError('INVALID_ENTITY', `unknown event "${action.target?.id}"`);
        }
        if (action.type === 'scrub') {
          throw new EngineError('UNSUPPORTED_ACTION', 'scrub unsupported');
        }

        const selection =
          action.type === 'select' && entity
            ? [...new Set([...state.selection, entity.id])]
            : state.selection;
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
        return () => { listeners.delete(fn); };
      },
      teardown(): void { listeners.clear(); },
    };
  }
}

export class StubVisualEngine implements Engine {
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
        if (action.type === 'focus') {
          state = { ...state, focus: action.target?.id ?? null, lastAction: action };
        } else {
          state = { ...state, lastAction: action };
        }

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as EngineEvent);
        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as EngineEvent);

        const suffix = action.type === 'focus' ? 'focused' : action.type === 'select' ? 'selected' : action.type;
        const evtName = `visual.${action.target?.id ?? 'unknown'}-${suffix}`;
        const ns = log.append(evtName, instanceId, { selection: state.selection }, action);
        emit(ns as EngineEvent);

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as EngineEvent);
      },
      snapshot() { return { ...state }; },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      },
      teardown(): void { listeners.clear(); },
    };
  }
}

export function makeRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new StubTimelineEngine());
  registry.register(new StubVisualEngine());
  return registry;
}