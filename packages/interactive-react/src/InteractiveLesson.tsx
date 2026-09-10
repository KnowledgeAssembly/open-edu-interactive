import {
  useEffect,
  useRef,
  useState,
  createElement,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { EngineRegistry, Lesson } from '@knowledgeassemble/interactive-engine';
import type { LessonRuntime, EngineAction, EngineEvent } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';
import type { OpenEduBridge } from './bridge.js';
import { bridgeToHost } from './bridge.js';
import { ensureInteractivePointerStyle, syncSvgSurface, bindSvgInteraction } from './svg-surface.js';
import type { SvgSurfaceSnapshot } from './svg-surface.js';

export interface InteractiveLessonProps {
  lesson: unknown;
  host: OpenEduBridge;
  controlsMode?: 'learner' | 'dev';
}

export interface InteractiveLessonHandle {
  dispatch(instanceId: string, action: EngineAction): void;
  snapshot(instanceId: string): unknown;
  events(): readonly EngineEvent[];
  instances(): string[];
}

interface InteractiveMapEntry {
  id: string;
  action: string;
}

function readInteractiveMap(snapshot: SvgSurfaceSnapshot): InteractiveMapEntry[] {
  const svgResult = snapshot.svgResult as { interactive?: InteractiveMapEntry[] } | undefined;
  return svgResult?.interactive ?? [];
}

export const InteractiveLesson = forwardRef<InteractiveLessonHandle, InteractiveLessonProps>(
  function InteractiveLesson({ lesson, host, controlsMode = 'learner' }: InteractiveLessonProps, ref) {
    const runtimeRef = useRef<LessonRuntime | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [instanceIds, setInstanceIds] = useState<string[]>([]);
    const [devMaps, setDevMaps] = useState<Record<string, InteractiveMapEntry[]>>({});
    const unbindMapRef = useRef<Map<string, () => void>>(new Map());
    const rootMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const contentMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const hostRef = useRef(host);
    hostRef.current = host;

    const refreshInstance = useCallback((instanceId: string) => {
      const runtime = runtimeRef.current;
      const content = contentMapRef.current.get(instanceId);
      const instance = runtime?.instances.get(instanceId);
      if (!content || !instance) return;
      syncSvgSurface(content, instance.snapshot() as SvgSurfaceSnapshot);
    }, []);

    const refreshAllRef = useRef<() => void>(() => {});
    refreshAllRef.current = () => {
      for (const instanceId of instanceIds) {
        refreshInstance(instanceId);
      }
    };

    const setInstanceRootRef = useCallback((instanceId: string, el: HTMLDivElement | null) => {
      if (el) {
        rootMapRef.current.set(instanceId, el);
      } else {
        rootMapRef.current.delete(instanceId);
      }
    }, []);

    const setInstanceContentRef = useCallback((instanceId: string, el: HTMLDivElement | null) => {
      if (el) {
        contentMapRef.current.set(instanceId, el);
      } else {
        contentMapRef.current.delete(instanceId);
      }
    }, []);

    useEffect(() => {
      const registry = new EngineRegistry();
      registry.register(new VisualEngine());
      registry.register(new ChartEngine());
      registry.register(new GeoMapEngine());
      registry.register(new TimelineEngine());
      registry.register(new DiagramEngine());
      const bridge = hostRef.current;
      const originalOnEvent = bridge.onEvent;
      const onEvent = (event: EngineEvent) => { originalOnEvent(event); };

      try {
        const parsed = Lesson.load(lesson, registry);
        const runtime = parsed.start(bridgeToHost({ ...bridge, onEvent }));
        runtimeRef.current = runtime;

        const ids: string[] = [];
        for (const instanceId of runtime.instances.keys()) {
          ids.push(instanceId);
        }

        setInstanceIds(ids);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }

      return () => {
        for (const unbind of unbindMapRef.current.values()) {
          unbind();
        }
        unbindMapRef.current.clear();
        rootMapRef.current.clear();
        contentMapRef.current.clear();
        runtimeRef.current?.stop();
        runtimeRef.current = null;
        setInstanceIds([]);
        setDevMaps({});
      };
    }, [lesson]);

    useEffect(() => {
      const runtime = runtimeRef.current;
      if (!runtime || instanceIds.length === 0) return;

      const lessonRoot = rootRef.current;
      if (lessonRoot) {
        ensureInteractivePointerStyle(lessonRoot);
      }

      const nextDevMaps: Record<string, InteractiveMapEntry[]> = {};

      for (const instanceId of instanceIds) {
        const instanceRoot = rootMapRef.current.get(instanceId);
        const content = contentMapRef.current.get(instanceId);
        const instance = runtime.instances.get(instanceId);
        if (!instanceRoot || !content || !instance) continue;

        ensureInteractivePointerStyle(instanceRoot);
        syncSvgSurface(content, instance.snapshot() as SvgSurfaceSnapshot);
        nextDevMaps[instanceId] = readInteractiveMap(instance.snapshot() as SvgSurfaceSnapshot);

        const unbind = bindSvgInteraction(instanceRoot, (action) => {
          runtime.dispatch(instanceId, action);
          refreshInstance(instanceId);
        });
        unbindMapRef.current.set(instanceId, unbind);
      }

      setDevMaps(nextDevMaps);

      return () => {
        for (const unbind of unbindMapRef.current.values()) {
          unbind();
        }
        unbindMapRef.current.clear();
      };
    }, [instanceIds, refreshInstance]);

    useImperativeHandle(
      ref,
      () => ({
        dispatch(instanceId: string, action: EngineAction): void {
          runtimeRef.current?.dispatch(instanceId, action);
          refreshInstance(instanceId);
        },
        snapshot(instanceId: string): unknown {
          return runtimeRef.current?.snapshot(instanceId);
        },
        events(): readonly EngineEvent[] {
          return runtimeRef.current?.events() ?? [];
        },
        instances(): string[] {
          return runtimeRef.current ? [...runtimeRef.current.instances.keys()] : [];
        },
      }),
      [refreshInstance],
    );

    if (error) {
      return createElement('div', { role: 'alert', style: { color: 'red' } }, error);
    }

    const children: Array<ReturnType<typeof createElement>> = [];

    for (const instanceId of instanceIds) {
      const instanceChildren: Array<ReturnType<typeof createElement>> = [
        createElement('div', {
          key: 'svg-content',
          ref: (el: HTMLDivElement | null) => setInstanceContentRef(instanceId, el),
          'data-oedu-svg-content': '',
        }),
      ];

      if (controlsMode === 'dev') {
        const interactiveMap = devMaps[instanceId] ?? [];
        if (interactiveMap.length > 0) {
          const buttons = interactiveMap.map((item, index) =>
            createElement(
              'button',
              {
                key: `${item.id}-${item.action}-${index}`,
                'data-interactive-id': item.id,
                'data-action': item.action,
                onClick: () => {
                  runtimeRef.current?.dispatch(instanceId, {
                    type: item.action as EngineAction['type'],
                    target: { id: item.id },
                  });
                  refreshInstance(instanceId);
                },
              },
              `${item.id} (${item.action})`,
            ),
          );
          instanceChildren.push(
            createElement('div', { key: 'interactive-map', 'aria-label': 'Interactive controls' }, ...buttons),
          );
        }
      }

      children.push(
        createElement(
          'div',
          {
            key: instanceId,
            ref: (el: HTMLDivElement | null) => setInstanceRootRef(instanceId, el),
            'data-instance-id': instanceId,
            'data-oedu-root': instanceId,
          },
          ...instanceChildren,
        ),
      );
    }

    return createElement(
      'div',
      {
        ref: rootRef,
        'data-interactive-lesson': '',
        'data-oedu-lesson-root': '',
        'data-controls-mode': controlsMode,
      },
      ...children,
    );
  },
);
