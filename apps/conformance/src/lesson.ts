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

const COMPOSED_LESSON = {
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
        purpose: { learningObjective: 'Explore major events in chronological order', reasoningMode: 'sequence' },
        content: {
          kind: 'events',
          events: [
            { id: 'event-1757', label: 'Battle of Plassey', date: '1757' },
            { id: 'event-1857', label: '1857 uprising', date: '1857' },
            { id: 'event-1885', label: 'Congress founded', date: '1885' },
            { id: 'event-1919', label: 'Jallianwala Bagh', date: '1919-04-13' },
            { id: 'event-1930', label: 'Salt March', date: '1930-03-12' },
            { id: 'event-1942', label: 'Quit India', date: '1942-08-08' },
            { id: 'event-1947', label: 'Independence', date: '1947-08-15', links: { visualEntityId: 'figure-independence' } },
          ],
          periods: [
            { id: 'period-company', label: 'Company rule', from: '1757', to: '1858', style: { role: 'secondary-period' } },
            { id: 'period-crown', label: 'British Raj', from: '1858', to: '1947', style: { role: 'primary-period' } },
          ],
          tracks: [
            { id: 'track-movement', label: 'National movement', events: ['event-1857', 'event-1919', 'event-1930', 'event-1942', 'event-1947'] },
            { id: 'track-reform', label: 'Constitutional reform', events: ['event-1885'] },
          ],
        },
        interaction: { mode: 'explore', actions: ['select', 'deselect', 'focus', 'play-pause', 'step', 'scrub', 'reset'] },
        questions: [],
        sources: [{ class: 'authoritative', title: 'Historical records' }],
        accessibility: { label: 'Timeline of Indian independence movements and constitutional reform.' },
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

interface LessonHarnessRemote {
  dispatch(instanceId: string, action: unknown): void;
  snapshot(instanceId: string): unknown;
  events(): ReadonlyArray<{ seq: number; name: string; instanceId: string }>;
  svg(instanceId: string): string;
  tryCreate(lesson: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __lessonHarness?: LessonHarnessRemote;
  }
}

export function mountLesson(app: HTMLElement): void {
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
      lesson: COMPOSED_LESSON,
      host,
    }),
  );

  window.__lessonHarness = {
    dispatch(instanceId: string, action: unknown) { handle?.dispatch(instanceId, action as EngineAction); },
    snapshot(instanceId: string) { return handle?.snapshot(instanceId); },
    events() { return [...emitted]; },
    svg(instanceId: string) {
      const s = handle?.snapshot(instanceId) as { svgResult?: { svg: string } } | undefined;
      return s?.svgResult?.svg ?? '';
    },
    tryCreate(lesson: unknown) {
      try {
        const registry = new EngineRegistry();
        registry.register(new VisualEngine());
        registry.register(new ChartEngine());
        registry.register(new GeoMapEngine());
        registry.register(new TimelineEngine());
        registry.register(new DiagramEngine());
        Lesson.load(lesson, registry);
        return { ok: true };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
}