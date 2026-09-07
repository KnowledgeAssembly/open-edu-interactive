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
import type { TimelineSpec, TimelineEvent, TimelineContent } from './schema.js';
import { TIMELINE_EVENT_SELECTED, TIMELINE_EVENT_FOCUSED } from './schema.js';
import { timelineReducer } from './reducer.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import type { LayoutContext } from './layout/engine.js';
import type { Scene } from './scene/types.js';
import type { SvgResult } from './render/types.js';
import { svgFrom } from './render/svg.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';

const DEFAULT_LAYOUT: LayoutContext = {
  width: 800,
  height: 600,
  minTouchTarget: 44,
  textStyle: 'normal',
};

function layoutContextFrom(tokens: Record<string, string>): LayoutContext {
  const numberToken = (key: string, fallback: number): number => {
    const raw = tokens[key];
    const value = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    width: numberToken('width', DEFAULT_LAYOUT.width),
    height: numberToken('height', DEFAULT_LAYOUT.height),
    minTouchTarget: numberToken('minTouchTarget', DEFAULT_LAYOUT.minTouchTarget),
    textStyle: tokens['textStyle'] ?? DEFAULT_LAYOUT.textStyle,
  };
}

function render(content: TimelineContent, ctx: LayoutContext, label?: string, description?: string): { scene: Scene; svgResult: SvgResult } {
  const s = buildScene(content);
  const laidOut = layout(s, ctx);
  const svgResult = svgFrom(laidOut, ctx, label, description);
  return { scene: laidOut, svgResult };
}

export class TimelineEngine implements Engine {
  readonly type: EngineType = 'timeline';

  validate(spec: EngineSpec): ValidationResult {
    const timelineSpec = spec as unknown as TimelineSpec;
    let artifacts: { scene: Scene; svgResult: SvgResult } | null = null;
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as TimelineSpec),
      layout: () => {
        if (!artifacts && timelineSpec.content) {
          try {
            artifacts = render(timelineSpec.content as TimelineContent, DEFAULT_LAYOUT, timelineSpec.accessibility?.label, timelineSpec.accessibility?.description);
          } catch {
            return { valid: true, issues: [] };
          }
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateLayout(artifacts.scene, DEFAULT_LAYOUT);
      },
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
    const content = timelineSpec.content as TimelineContent;
    const ctx = layoutContextFrom(host.tokens);
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    const events: readonly TimelineEvent[] = content.events;
    const seq: string[] = [...events.map((e) => e.id)];

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    let laidOut: Scene = { nodes: [], semantics: {} };
    let svgResult: SvgResult = { svg: '', a11y: [], interactive: [], linear: [] };

    function recompute(): void {
      const result = render(content, ctx, timelineSpec.accessibility?.label, timelineSpec.accessibility?.description);
      laidOut = result.scene;
      svgResult = result.svgResult;
    }

    recompute();

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

    function findEventPayload(action: EngineAction): Record<string, unknown> | undefined {
      if (action.type !== 'select' && action.type !== 'focus') return undefined;
      const targetId = action.target?.id;
      if (!targetId) return undefined;
      const event = content.events.find((e) => e.id === targetId);
      if (!event) return undefined;
      return event as unknown as Record<string, unknown>;
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        const eventPayload = findEventPayload(action);
        const reduced = timelineReducer(state, action, seq);
        state = reduced;

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (eventPayload && (action.type === 'select' || action.type === 'focus')) {
          const evtName = action.type === 'select' ? TIMELINE_EVENT_SELECTED : TIMELINE_EVENT_FOCUSED;
          const nsEvent = log.append(evtName, instanceId, eventPayload as Record<string, unknown>, {
            ...action,
            payload: eventPayload,
          });
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        }

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as Parameters<EngineHost['onEvent']>[0]);

        if (host.reducedMotion && action.type === 'select') {
          host.announce(`Selected ${action.target?.id ?? 'unknown'}`);
        }
      },
      snapshot() {
        return {
          ...state,
          events,
          scene: laidOut,
          svgResult,
          linear: svgResult.linear,
        };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      },
      teardown(): void {
        state = { ...state, phase: 'torn-down' as const };
        listeners.clear();
      },
    };
  }
}