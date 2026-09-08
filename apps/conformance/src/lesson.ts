import { EngineRegistry, Lesson, type EngineAction, type EngineEvent } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';

const COMPOSED_LESSON = {
  type: 'interactive',
  id: 'independence-narrative-demo',
  title: 'Timeline drives visual focus (composition smoke test)',
  engines: [
    {
      instanceId: 'timeline-independence',
      engine: 'timeline',
      spec: {
        type: 'timeline',
        version: '1.0.0',
        id: 'timeline-independence',
        metadata: { title: 'Indian independence — key events' },
        content: {
          kind: 'events',
          events: [
            { id: 'event-1857', label: '1857 uprising', date: '1857' },
            { id: 'event-1947', label: 'Independence', date: '1947-08-15', links: { visualEntityId: 'figure-independence' } },
          ],
        },
        interaction: { mode: 'explore', actions: ['select', 'focus', 'play-pause', 'step', 'reset'] },
        sources: [{ class: 'authoritative' }],
        accessibility: { label: 'Timeline of Indian independence' },
        questions: [],
      },
    },
    {
      instanceId: 'visual-independence',
      engine: 'visual',
      spec: {
        type: 'visual',
        version: '1.0.0',
        id: 'visual-independence',
        content: {
          kind: 'illustration',
          entities: [{ id: 'figure-independence', label: 'Independence celebration' }],
        },
        interaction: { mode: 'explore', actions: ['focus', 'select', 'reset'] },
        accessibility: { label: 'Historical illustration for selected timeline event' },
        questions: [],
      },
    },
  ],
  bindings: [
    { on: 'timeline.event-selected', from: 'timeline-independence', dispatch: { to: 'visual-independence', action: 'focus', targetIdFrom: 'links.visualEntityId' } },
  ],
};

interface LessonHarnessRemote {
  dispatch(instanceId: string, action: unknown): void;
  snapshot(instanceId: string): unknown;
  events(): ReadonlyArray<{ seq: number; name: string; instanceId: string }>;
  svg(instanceId: string): string;
  tryCreate(lesson: unknown): { ok: boolean };
}

declare global {
  interface Window {
    __lessonHarness?: LessonHarnessRemote;
  }
}

export function mountLesson(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new VisualEngine());
  registry.register(new TimelineEngine());

  const lesson = Lesson.load(COMPOSED_LESSON, registry);
  const emitted: Array<EngineEvent> = [];
  const host = {
    locale: 'en' as const,
    tokens: {},
    reducedMotion: false,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: EngineEvent) => { if (emitted.length < 500) emitted.push(event); },
    resolveAsset: (id: string) => id,
  };

  const runtime = lesson.start(host);

  const timelineDiv = document.createElement('div');
  timelineDiv.setAttribute('data-oedu-root', 'timeline');
  const tlSnap = runtime.snapshot('timeline-independence') as { events: Array<{ id: string; label: string; date: string }> };
  const events = tlSnap.events ?? [];
  for (const event of events) {
    const btn = document.createElement('button');
    btn.setAttribute('data-event-id', event.id);
    btn.setAttribute('aria-label', event.label);
    btn.textContent = `${event.date} — ${event.label}`;
    btn.onclick = () => runtime.dispatch('timeline-independence', { type: 'select', target: { id: event.id } } as EngineAction);
    timelineDiv.appendChild(btn);
  }
  app.appendChild(timelineDiv);

  const visSnap = runtime.snapshot('visual-independence') as { svgResult?: { svg: string } };
  const visualDiv = document.createElement('div');
  visualDiv.setAttribute('data-oedu-root', 'visual');
  visualDiv.innerHTML = visSnap.svgResult?.svg ?? '';
  app.appendChild(visualDiv);

  window.__lessonHarness = {
    dispatch(instanceId: string, action: unknown) { runtime.dispatch(instanceId, action as EngineAction); },
    snapshot(instanceId: string) { return runtime.snapshot(instanceId); },
    events() { return [...emitted]; },
    svg(instanceId: string) {
      const s = runtime.snapshot(instanceId) as { svgResult?: { svg: string } };
      return s?.svgResult?.svg ?? '';
    },
    tryCreate(lesson: unknown) {
      try { Lesson.load(lesson, registry); return { ok: true }; }
      catch { return { ok: false }; }
    },
  };
}