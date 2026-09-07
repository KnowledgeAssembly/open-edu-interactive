import {
  type Engine,
  type EngineInstance,
  type EngineType,
  type EngineSpec,
  type EngineHost,
  type ValidationResult,
  type EngineAction,
  type EngineState,
  EngineError,
  initialState,
  runPipeline,
  EventLog,
} from '@knowledgeassemble/interactive-engine';
import type { TimelineSpec, TimelineEvent } from './schema.js';
import { TIMELINE_EVENT_SELECTED } from './schema.js';
import { timelineReducer } from './reducer.js';

function validateTimeline(spec: TimelineSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  if (spec.content?.kind !== 'events') {
    issues.push({
      level: 'L2',
      code: 'INVALID_ENTITY',
      message: 'timeline: content.kind must be "events"',
    });
  }
  const events = spec.content?.events ?? [];
  const ids = new Set<string>();
  for (const [i, event] of events.entries()) {
    if (!event.id) {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: `timeline: event at index ${i} has no id`,
      });
    }
    if (ids.has(event.id)) {
      issues.push({
        level: 'L2',
        code: 'INVALID_ENTITY',
        message: `timeline: duplicate event id "${event.id}"`,
      });
    }
    ids.add(event.id);
  }
  return { valid: issues.length === 0, issues };
}

export class TimelineEngine implements Engine {
  readonly type: EngineType = 'timeline';

  validate(spec: EngineSpec): ValidationResult {
    return runPipeline(spec, {
      semantic: (s) => validateTimeline(s as unknown as TimelineSpec),
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `timeline engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const timelineSpec = spec as unknown as TimelineSpec;
    const events: readonly TimelineEvent[] = timelineSpec.content.events;
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    function emit(event: Parameters<EngineHost['onEvent']>[0]): void {
      host.onEvent(event);
      for (const listener of listeners) {
        listener(event);
      }
    }

    const mounted = log.append('engine-mounted', instanceId);
    const ready = log.append('engine-ready', instanceId);
    emit(mounted as Parameters<EngineHost['onEvent']>[0]);
    emit(ready as Parameters<EngineHost['onEvent']>[0]);

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        const entity =
          action.type === 'select'
            ? events.find((e) => e.id === action.target?.id)
            : undefined;

        const reduced = timelineReducer(state, action, events);
        state = reduced;

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (action.type === 'select' && entity) {
          const nsEvent = log.append(
            TIMELINE_EVENT_SELECTED,
            instanceId,
            entity as Record<string, unknown>,
            { ...action, payload: entity },
          );
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        }

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as Parameters<EngineHost['onEvent']>[0]);

        if (host.reducedMotion && action.type === 'select') {
          host.announce(`Selected ${entity?.label ?? action.target?.id ?? 'unknown'}`);
        }
      },
      snapshot() {
        return { ...state, events };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => {
          listeners.delete(fn);
        };
      },
      teardown(): void {
        state = { ...state, phase: 'torn-down' };
        listeners.clear();
      },
    };
  }
}
