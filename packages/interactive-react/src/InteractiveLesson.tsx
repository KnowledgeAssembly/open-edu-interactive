import { useEffect, useRef, useState, createElement, forwardRef, useImperativeHandle } from 'react';
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

export const InteractiveLesson = forwardRef<InteractiveLessonHandle, InteractiveLessonProps>(
  function InteractiveLesson({ lesson, host }: InteractiveLessonProps, ref) {
    const runtimeRef = useRef<LessonRuntime | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [instanceIds, setInstanceIds] = useState<string[]>([]);
    const unbindMapRef = useRef<Map<string, () => void>>(new Map());
    const contentMapRef = useRef<Map<string, HTMLElement>>(new Map());

    useEffect(() => {
      const registry = new EngineRegistry();
      registry.register(new VisualEngine());
      registry.register(new ChartEngine());
      registry.register(new GeoMapEngine());
      registry.register(new TimelineEngine());
      registry.register(new DiagramEngine());
      const originalOnEvent = host.onEvent;
      const onEvent = (event: EngineEvent) => { originalOnEvent(event); };

      try {
        const parsed = Lesson.load(lesson, registry);
        const runtime = parsed.start(bridgeToHost({ ...host, onEvent }));
        runtimeRef.current = runtime;

        const ids: string[] = [];
        for (const instanceId of runtime.instances.keys()) {
          ids.push(instanceId);
        }

        setInstanceIds(ids);
        setError(null);

        // Bind SVG interaction per instance
        const root = rootRef.current;
        if (root) {
          ensureInteractivePointerStyle(root);
          for (const instanceId of ids) {
            const instance = runtime.instances.get(instanceId);
            if (!instance) continue;

            const content = document.createElement('div');
            content.setAttribute('data-oedu-svg-content', '');
            content.setAttribute('data-instance-id', instanceId);
            root.appendChild(content);
            contentMapRef.current.set(instanceId, content);

            syncSvgSurface(content, instance.snapshot() as SvgSurfaceSnapshot);

            const unbind = bindSvgInteraction(content, (action) => {
              runtime.dispatch(instanceId, action);
              const updatedContent = contentMapRef.current.get(instanceId);
              if (updatedContent) {
                syncSvgSurface(updatedContent, instance.snapshot() as SvgSurfaceSnapshot);
              }
            });
            unbindMapRef.current.set(instanceId, unbind);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }

      return () => {
        for (const unbind of unbindMapRef.current.values()) {
          unbind();
        }
        unbindMapRef.current.clear();
        contentMapRef.current.clear();
        runtimeRef.current?.stop();
        runtimeRef.current = null;
      };
    }, [lesson, host]);

    useImperativeHandle(
      ref,
      () => ({
        dispatch(instanceId: string, action: EngineAction): void {
          runtimeRef.current?.dispatch(instanceId, action);
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
      [],
    );

    if (error) {
      return createElement('div', { role: 'alert', style: { color: 'red' } }, error);
    }

    const children: Array<ReturnType<typeof createElement>> = [];

    for (const instanceId of instanceIds) {
      children.push(
        createElement('div', {
          key: instanceId,
          'data-instance-id': instanceId,
          'data-oedu-root': instanceId,
        }),
      );
    }

    return createElement('div', {
      ref: rootRef,
      'data-interactive-lesson': '',
      'data-oedu-lesson-root': '',
    }, ...children);
  },
);