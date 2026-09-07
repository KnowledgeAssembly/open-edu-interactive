import type { EngineAction } from '../core/action.js';
import type { EngineEvent } from '../core/event.js';
import { EngineError } from '../core/errors.js';
import type { EngineHost } from '../core/host.js';
import { initialState, type EngineState } from '../core/state.js';
import type { EngineInstance, EngineType } from '../core/engine.js';
import type { EngineSpec } from '../schemas/envelope.js';
import { validateEnvelope } from '../validation/validate.js';
import { EventLog } from './event-log.js';
import { baseReducer } from './reducer.js';

let instanceSeq = 0;

function nextInstanceId(specId: string): string {
  instanceSeq += 1;
  return specId || `engine-${instanceSeq}`;
}

function reducedMotionAnnounceOn(
  type: EngineAction['type'],
  stateBefore: EngineState,
  stateAfter: EngineState,
): string | null {
  if (type === 'select' || type === 'deselect') {
    return stateAfter.selection.join(', ') || 'Nothing selected';
  }
  if (type === 'focus') {
    return stateAfter.focus ? `Focused ${stateAfter.focus}` : null;
  }
  if (type === 'unfocus') {
    return stateBefore.focus ? `Unfocused ${stateBefore.focus}` : null;
  }
  return null;
}

export function createPlatformInstance(
  spec: EngineSpec,
  host: EngineHost,
  id?: string,
): EngineInstance {
  const validation = validateEnvelope(spec);
  if (!validation.valid) {
    throw new EngineError(
      'INVALID_SPEC',
      `invalid engine spec: ${validation.issues[0]?.message ?? 'unknown error'}`,
    );
  }

  const instanceId = id ?? nextInstanceId(spec.id);
  const engine: EngineType = spec.type as EngineType;
  const log = new EventLog();
  const listeners = new Set<(e: EngineEvent) => void>();

  let state: EngineState = { ...initialState(instanceId, engine), phase: 'running' };

  function emit(event: EngineEvent): void {
    host.onEvent(event);
    for (const listener of listeners) {
      listener(event);
    }
  }

  const mounted = log.append('engine-mounted', instanceId);
  const ready = log.append('engine-ready', instanceId);
  emit(mounted);
  emit(ready);

  return {
    id: instanceId,
    engine,
    dispatch(action: EngineAction): void {
      const before = state;
      const reduced = baseReducer(state, action); // throws on invalid/unsupported before any event

      const started = log.append(
        'interaction-started',
        instanceId,
        undefined,
        action,
      );
      emit(started);

      state = reduced;

      const changed = log.append('state-changed', instanceId, undefined, action);
      emit(changed);

      const completed = log.append('interaction-completed', instanceId, undefined, action);
      emit(completed);

      if (host.reducedMotion) {
        const message = reducedMotionAnnounceOn(action.type, before, state);
        if (message) {
          host.announce(message);
        }
      }
    },
    snapshot(): Readonly<EngineState> {
      return state;
    },
    subscribe(fn: (e: EngineEvent) => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    teardown(): void {
      state = { ...state, phase: 'torn-down' };
      for (const listener of listeners) {
        listeners.delete(listener);
      }
    },
  };
}
