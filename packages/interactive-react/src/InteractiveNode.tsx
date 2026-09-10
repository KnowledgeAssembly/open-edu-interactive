import { createElement, useEffect, useImperativeHandle, useRef, useState, forwardRef, useCallback } from 'react';
import type { Engine, EngineAction, EngineEvent, EngineInstance, EngineSpec } from '@knowledgeassemble/interactive-engine';
import { EngineError } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';
import type { OpenEduBridge } from './bridge.js';
import { bridgeToHost } from './bridge.js';
import { ensureInteractivePointerStyle, syncSvgSurface, bindSvgInteraction } from './svg-surface.js';
import type { SvgSurfaceSnapshot } from './svg-surface.js';

const ENGINE_MAP: Record<string, new () => Engine> = {
  visual: VisualEngine,
  chart: ChartEngine,
  geomap: GeoMapEngine,
  timeline: TimelineEngine,
  diagram: DiagramEngine,
};

export interface InteractiveNodeHandle {
  dispatch(action: EngineAction): void;
  snapshot(): unknown;
  events(): readonly EngineEvent[];
}

export interface InteractiveNodeProps {
  spec: unknown;
  engineType: string;
  host: OpenEduBridge;
  id?: string;
  controlsMode?: 'learner' | 'dev';
}

function flattenA11y(
  nodes: Array<{ id: string; role: string; label?: string; description?: string; children: unknown[] }>,
  depth = 0,
): string {
  let result = '';
  for (const node of nodes) {
    const label = node.label ?? node.id;
    result += `${'  '.repeat(depth)}${label}\n`;
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      result += flattenA11y(node.children as typeof nodes, depth + 1);
    }
  }
  return result;
}

export const InteractiveNode = forwardRef<InteractiveNodeHandle, InteractiveNodeProps>(
  function InteractiveNode({ spec, engineType, host, id, controlsMode = 'learner' }: InteractiveNodeProps, ref) {
    const svgRootRef = useRef<HTMLDivElement>(null);
    const svgContentRef = useRef<HTMLDivElement>(null);
    const a11yRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<EngineInstance | null>(null);
    const unbindRef = useRef<(() => void) | null>(null);
    const bufferRef = useRef<EngineEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [a11yText, setA11yText] = useState<string>('');
    const [interactiveMap, setInteractiveMap] = useState<Array<{ id: string; action: string }>>([]);
    const refreshRef = useRef<() => void>(() => {});

    const refresh = useCallback(() => {
      const inst = instanceRef.current;
      if (!inst) return;
      const snap = inst.snapshot() as SvgSurfaceSnapshot;
      const content = svgContentRef.current;
      if (content) {
        syncSvgSurface(content, snap);
      }
      const svgResult = snap.svgResult as { a11y?: Array<unknown>; interactive?: Array<{ id: string; action: string }> } | undefined;
      if (svgResult) {
        setA11yText(flattenA11y(svgResult.a11y as Array<{ id: string; role: string; label?: string; description?: string; children: unknown[] }>));
        setInteractiveMap(svgResult.interactive ?? []);
      }
    }, []);

    refreshRef.current = refresh;

    useEffect(() => {
      const EngineClass = ENGINE_MAP[engineType];
      if (!EngineClass) {
        setError(`unknown engine type: "${engineType}"`);
        return;
      }

      const engine = new EngineClass();
      const eventsRef: EngineEvent[] = [];
      bufferRef.current = eventsRef;
      const engineHost = bridgeToHost({
        ...host,
        onEvent: (event) => {
          eventsRef.push(event as EngineEvent);
          host.onEvent(event);
        },
      });
      const instanceId = id ?? (spec as Record<string, unknown>).id as string | undefined ?? 'interactive-node';

      const validation = engine.validate(spec as EngineSpec);
      if (!validation.valid) {
        const msg = validation.issues.map((i) => i.message).join('; ');
        setError(`validation failed: ${msg}`);
        return;
      }

      let instance: EngineInstance;
      try {
        instance = engine.instantiate(spec as EngineSpec, engineHost, instanceId);
      } catch (e) {
        if (e instanceof EngineError) {
          setError(e.message);
        } else {
          setError(String(e));
        }
        return;
      }

      instanceRef.current = instance;
      setError(null);

      const root = svgRootRef.current;
      const content = svgContentRef.current;

      if (root && content) {
        ensureInteractivePointerStyle(root);
        syncSvgSurface(content, instance.snapshot() as SvgSurfaceSnapshot);

        const unbind = bindSvgInteraction(root, (action) => {
          instance.dispatch(action);
          refreshRef.current();
        });
        unbindRef.current = unbind;

        const state = instance.snapshot() as SvgSurfaceSnapshot;
        const svgResult = state.svgResult as { a11y?: Array<unknown>; interactive?: Array<{ id: string; action: string }> } | undefined;
        if (svgResult) {
          setA11yText(flattenA11y(svgResult.a11y as Array<{ id: string; role: string; label?: string; description?: string; children: unknown[] }>));
          setInteractiveMap(svgResult.interactive ?? []);
        }
      }

      return () => {
        if (unbindRef.current) unbindRef.current();
        unbindRef.current = null;
        instance.teardown();
        instanceRef.current = null;
      };
    }, [spec, engineType, host, id]);

    useImperativeHandle(
      ref,
      () => ({
        dispatch(action: EngineAction): void {
          instanceRef.current?.dispatch(action);
          refreshRef.current();
        },
        snapshot(): unknown {
          return instanceRef.current?.snapshot();
        },
        events(): readonly EngineEvent[] {
          return bufferRef.current;
        },
      }),
      [],
    );

    if (error) {
      return createElement('div', { role: 'alert', style: { color: 'red' } }, error);
    }

    const children: Array<ReturnType<typeof createElement>> = [];

    children.push(
      createElement('div', {
        key: 'svg-root',
        ref: svgRootRef,
        'data-oedu-svg-root': '',
      },
        createElement('div', {
          key: 'svg-content',
          ref: svgContentRef,
          'data-oedu-svg-content': '',
        }),
      ),
    );

    children.push(
      createElement('div', {
        key: 'a11y-region',
        ref: a11yRef,
        'aria-live': 'polite',
        'aria-label': 'Interactive content accessibility tree',
        style: {
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        },
      }, a11yText),
    );

    if (controlsMode === 'dev' && interactiveMap.length > 0) {
      const buttons = interactiveMap.map((item, index) =>
        createElement(
          'button',
          {
            key: `${item.id}-${item.action}-${index}`,
            'data-interactive-id': item.id,
            'data-action': item.action,
            onClick: () => {
              instanceRef.current?.dispatch({ type: item.action as EngineAction['type'], target: { id: item.id } });
              refreshRef.current();
            },
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                instanceRef.current?.dispatch({ type: item.action as EngineAction['type'], target: { id: item.id } });
                refreshRef.current();
              }
            },
          },
          `${item.id} (${item.action})`,
        ),
      );
      children.push(
        createElement('div', { key: 'interactive-map', 'aria-label': 'Interactive controls' }, ...buttons),
      );
    }

    return createElement('div', { 'data-interactive-node': '' }, ...children);
  },
);