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
import type { GeoMapSpec, GeoMapContent } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import type { LayoutContext } from './layout/engine.js';
import { svgFrom } from './render/svg.js';
import type { Scene } from './scene/types.js';
import type { SvgResult } from './render/types.js';

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

function render(
  content: GeoMapContent,
  ctx: LayoutContext,
  resolveAsset: (id: string) => string | Uint8Array,
  label?: string,
  description?: string,
): { scene: Scene; svgResult: SvgResult } {
  const scene = layout(buildScene(content, resolveAsset), ctx);
  const svgResult = svgFrom(scene, ctx, label, description);
  return { scene, svgResult };
}

export class GeoMapEngine implements Engine {
  readonly type: EngineType = 'geomap';

  validate(spec: EngineSpec): ValidationResult {
    const geomapSpec = spec as unknown as GeoMapSpec;
    let artifacts: { scene: Scene; svgResult: SvgResult } | null = null;
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as GeoMapSpec),
      layout: () => {
        if (!artifacts && geomapSpec.content) {
          artifacts = render(
            geomapSpec.content,
            DEFAULT_LAYOUT,
            (id: string) => id,
            geomapSpec.accessibility?.label,
            geomapSpec.accessibility?.description,
          );
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateLayout(artifacts.scene, DEFAULT_LAYOUT);
      },
      accessibility: () => {
        if (!artifacts && geomapSpec.content) {
          artifacts = render(
            geomapSpec.content,
            DEFAULT_LAYOUT,
            (id: string) => id,
            geomapSpec.accessibility?.label,
            geomapSpec.accessibility?.description,
          );
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateAccessibility(geomapSpec, artifacts.svgResult);
      },
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `geomap engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const geomapSpec = spec as unknown as GeoMapSpec;
    const content = geomapSpec.content as GeoMapContent;
    const ctx = layoutContextFrom(host.tokens);
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    let laidOut: Scene = { nodes: [], semantics: {} };
    let svgResult: SvgResult = { svg: '', a11y: [], interactive: [], alternative: [] };

    function recompute(): void {
      const result = render(content, ctx, host.resolveAsset, geomapSpec.accessibility?.label, geomapSpec.accessibility?.description);
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

    const resultSuffix: Record<string, string> = {
      select: 'selected',
      deselect: 'deselected',
      focus: 'focused',
      unfocus: 'unfocused',
    };

    function findEntityPayload(action: EngineAction): Record<string, unknown> | undefined {
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
        const entityPayload = findEntityPayload(action);
        const reduced = baseReducer(state, action);
        state = reduced;

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (entityPayload && (action.type === 'select' || action.type === 'focus')) {
          const suffix = resultSuffix[action.type] ?? action.type;
          const evtName = `geomap.entity-${suffix}`;
          const nsEvent = log.append(evtName, instanceId, entityPayload as Record<string, unknown>, {
            ...action,
            payload: entityPayload,
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
          alternative: svgResult.alternative,
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