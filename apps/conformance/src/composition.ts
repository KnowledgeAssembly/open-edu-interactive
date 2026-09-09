import { Lesson, EngineRegistry, type EngineAction, type EngineEvent } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { loadSpec } from '@knowledgeassemble/dev-harness';

export function mountComposition(app: HTMLElement, lesson?: unknown): void {
  const spec = lesson ?? (loadSpec('docs/fixtures/p7/composed-lesson.json') as never);
  const registry = new EngineRegistry();
  registry.register(new VisualEngine());
  registry.register(new TimelineEngine());

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

  const runtime = Lesson.load(spec, registry).start(host);

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
    dispatch(instanceId?: string, action?: unknown): void {
      if (instanceId) runtime.dispatch(instanceId, action as EngineAction);
    },
    snapshot(instanceId?: unknown): unknown {
      if (typeof instanceId === 'string') return runtime.snapshot(instanceId);
      return runtime.snapshot('');
    },
    events(): Array<{ seq: number; name: string; action?: unknown }> {
      return [...emitted] as Array<{ seq: number; name: string; action?: unknown }>;
    },
    svg(_instanceId?: string): string {
      const snap = runtime.snapshot(_instanceId ?? 'timeline-independence') as { svgResult?: { svg: string } };
      return snap?.svgResult?.svg ?? '';
    },
    tryCreate(l: unknown): { ok: boolean; code?: string } {
      try {
        Lesson.load(l, registry);
        return { ok: true };
      } catch (e) {
        const err = e as { code?: string };
        return { ok: false, code: err.code };
      }
    },
  };
  window.__harness = window.__compositionHarness as unknown as Window['__harness'];
}