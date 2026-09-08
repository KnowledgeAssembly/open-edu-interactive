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

export interface InteractiveLessonProps {
  lesson: unknown;
  host: OpenEduBridge;
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
    const [error, setError] = useState<string | null>(null);
    const [instanceContainers, setInstanceContainers] = useState<Map<string, string>>(new Map());

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

        const containers = new Map<string, string>();
        for (const [instanceId, instance] of runtime.instances) {
          const state = instance.snapshot() as Record<string, unknown>;
          const svgResult = state.svgResult as { svg: string } | undefined;
          if (svgResult) {
            containers.set(instanceId, svgResult.svg);
          }
        }
        setInstanceContainers(containers);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }

      return () => {
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
    for (const [instanceId, svg] of instanceContainers) {
      children.push(
        createElement('div', {
          key: instanceId,
          'data-instance-id': instanceId,
          'data-oedu-root': instanceId,
          dangerouslySetInnerHTML: { __html: svg },
        }),
      );
    }

    return createElement('div', { 'data-interactive-lesson': '' }, ...children);
  },
);