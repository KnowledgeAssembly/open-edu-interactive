import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { EngineRegistry, Lesson } from '@knowledgeassemble/interactive-engine';
import type { EngineAction, EngineEvent } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';
import type { InteractiveLessonHandle } from '@knowledgeassemble/interactive-react';
import { loadSpec } from '@knowledgeassemble/dev-harness';

export function mountLesson(app: HTMLElement, lesson?: unknown): void {
  const spec = lesson ?? (loadSpec('docs/fixtures/composition/narrative-timeline-visual.json') as never);

  const emitted: Array<EngineEvent> = [];
  const host = {
    locale: 'en' as const,
    tokens: {},
    reducedMotion: false,
    t: (key: string) => key,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: EngineEvent) => { if (emitted.length < 500) emitted.push(event); },
    resolveAsset: (id: string) => id,
  };

  let handle: InteractiveLessonHandle | null = null;
  const root = createRoot(app);
  root.render(
    createElement(InteractiveLesson, {
      ref: (node: InteractiveLessonHandle | null) => { handle = node; },
      lesson: spec,
      host,
    }),
  );

  window.__lessonHarness = {
    dispatch(instanceId: string, action: unknown) { handle?.dispatch(instanceId, action as EngineAction); },
    snapshot(instanceId?: string) { return handle?.snapshot(instanceId ?? ""); },
    events() { return [...emitted]; },
    svg(_instanceId?: string): string {
      const s = handle?.snapshot(_instanceId ?? "") as { svgResult?: { svg: string } } | undefined;
      return s?.svgResult?.svg ?? '';
    },
    tryCreate(l: unknown) {
      try {
        const registry = new EngineRegistry();
        registry.register(new VisualEngine());
        registry.register(new ChartEngine());
        registry.register(new GeoMapEngine());
        registry.register(new TimelineEngine());
        registry.register(new DiagramEngine());
        Lesson.load(l, registry);
        return { ok: true };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
  window.__harness = window.__lessonHarness as unknown as Window['__harness'];
}