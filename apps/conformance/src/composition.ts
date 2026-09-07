import { Lesson, EngineRegistry, type EngineAction, type EngineEvent } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';

const CANONICAL_FIXTURE = {
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
        content: { kind: 'illustration', entities: [{ id: 'figure-independence', label: 'Independence celebration' }] },
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

interface CompositionHarnessRemote {
  dispatch(instanceId: string, action: { type: string; target?: { id: string } }): void;
  snapshot(instanceId: string): unknown;
  events(): ReadonlyArray<{ seq: number; name: string }>;
  svg(instanceId: string): string;
  tryCreate(lesson: unknown): { ok: boolean; code?: string };
}

declare global {
  interface Window {
    __compositionHarness?: CompositionHarnessRemote;
  }
}

export function mountComposition(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new VisualEngine());
  registry.register(new TimelineEngine());

  const lesson = Lesson.load(CANONICAL_FIXTURE, registry);
  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = {
    locale: 'en' as const,
    tokens: {},
    reducedMotion: false,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 500) emitted.push({ seq: event.seq, name: event.name, action: event.action });
    },
    resolveAsset: (id: string) => id,
  };

  const runtime = lesson.start(host);

  const visualSnapshot = runtime.snapshot('visual-independence') as { svgResult?: { svg: string } };
  const svgContent = visualSnapshot.svgResult?.svg ?? '';
  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'visual');
  svgContainer.innerHTML = svgContent;
  app.appendChild(svgContainer);

  const timelineList = document.createElement('div');
  timelineList.setAttribute('data-oedu-root', 'timeline');
  timelineList.setAttribute('role', 'list');
  timelineList.setAttribute('aria-label', 'Timeline events');
  const timelineSnapshot = runtime.snapshot('timeline-independence') as { events: Array<{ id: string; label: string; date: string }> };
  const events = timelineSnapshot.events ?? [];
  for (const event of events) {
    const btn = document.createElement('button');
    btn.setAttribute('data-event-id', event.id);
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', event.label);
    btn.textContent = `${event.date} — ${event.label}`;
    btn.addEventListener('click', () => {
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: event.id } } as EngineAction);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        runtime.dispatch('timeline-independence', { type: 'select', target: { id: event.id } } as EngineAction);
      }
    });
    timelineList.appendChild(btn);
  }
  app.appendChild(timelineList);

  window.__compositionHarness = {
    dispatch(instanceId: string, action: { type: string; target?: { id: string } }): void {
      runtime.dispatch(instanceId, action as EngineAction);
    },
    snapshot(instanceId: string): unknown {
      return runtime.snapshot(instanceId);
    },
    events(): ReadonlyArray<{ seq: number; name: string }> {
      return [...emitted];
    },
    svg(instanceId: string): string {
      const snap = runtime.snapshot(instanceId) as { svgResult?: { svg: string } };
      return snap?.svgResult?.svg ?? '';
    },
    tryCreate(lesson: unknown): { ok: boolean; code?: string } {
      try {
        Lesson.load(lesson, registry);
        return { ok: true };
      } catch (e) {
        const err = e as { code?: string };
        return { ok: false, code: err.code };
      }
    },
  };
}