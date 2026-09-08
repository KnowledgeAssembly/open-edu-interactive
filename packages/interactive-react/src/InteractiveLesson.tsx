import { useEffect, useRef, useState, createElement } from 'react';
import { EngineRegistry, Lesson } from '@knowledgeassemble/interactive-engine';
import type { LessonRuntime } from '@knowledgeassemble/interactive-engine';
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

export function InteractiveLesson({ lesson, host }: InteractiveLessonProps) {
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

    try {
      const parsed = Lesson.load(lesson, registry);
      const runtime = parsed.start(bridgeToHost(host));
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

  if (error) {
    return createElement('div', { role: 'alert', style: { color: 'red' } }, error);
  }

  const children: Array<ReturnType<typeof createElement>> = [];
  for (const [instanceId, svg] of instanceContainers) {
    children.push(
      createElement('div', {
        key: instanceId,
        'data-instance-id': instanceId,
        dangerouslySetInnerHTML: { __html: svg },
      }),
    );
  }

  return createElement('div', { 'data-interactive-lesson': '' }, ...children);
}