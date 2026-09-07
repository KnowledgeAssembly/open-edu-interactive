import {
  runPipeline,
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
  baseReducer,
  EventLog,
} from '@knowledgeassemble/interactive-engine';
import type { ChartSpec, ChartContent } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import type { LayoutContext } from './layout/engine.js';
import { svgFrom } from './render/svg.js';

export class ChartEngine implements Engine {
  readonly type: EngineType = 'chart';

  validate(spec: EngineSpec): ValidationResult {
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as ChartSpec),
      layout: () => validateLayout(),
      accessibility: (s) => validateAccessibility(s as unknown as ChartSpec),
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `chart engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const chartSpec = spec as unknown as ChartSpec;
    const content = chartSpec.content as ChartContent;
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    const ctx: LayoutContext = {
      width: 800,
      height: 600,
      minTouchTarget: 44,
      textStyle: 'normal',
    };

    const scene = buildScene(content);
    const laidOut = layout(scene, content, ctx);
    const svgResult = svgFrom(laidOut, ctx, chartSpec.accessibility?.label, chartSpec.accessibility?.description);

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

    const resultSuffix: Record<string, string> = {
      select: 'selected',
      deselect: 'deselected',
      focus: 'focused',
      unfocus: 'unfocused',
    };

    function findRowPayload(action: EngineAction): Record<string, unknown> | undefined {
      if (action.type !== 'select' && action.type !== 'focus') return undefined;
      const targetId = action.target?.id;
      if (!targetId) return undefined;
      const node = laidOut.semantics[targetId];
      if (!node) return undefined;
      return node.metadata as Record<string, unknown>;
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        const rowPayload = findRowPayload(action);
        const reduced = baseReducer(state, action);
        state = reduced;

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (rowPayload && (action.type === 'select' || action.type === 'focus')) {
          const suffix = resultSuffix[action.type] ?? action.type;
          const evtName = `chart.data-point-${suffix}`;
          const nsEvent = log.append(evtName, instanceId, rowPayload as Record<string, unknown>, {
            ...action,
            payload: rowPayload,
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
          scene: laidOut,
          svgResult,
          tabular: svgResult.tabular,
        };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      },
      teardown(): void {
        listeners.clear();
      },
    };
  }
}