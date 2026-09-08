import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import type { EngineAction } from '@knowledgeassemble/interactive-engine';

const INDEPENDENCE_SPEC = {
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
};

interface TimeRow {
  kind: string;
  id: string;
  label: string;
  date?: string;
  from?: string;
  to?: string;
  trackId?: string;
  trackLabel?: string;
  description?: string;
}

interface TimelineHarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  svg(): string;
  linear(): TimeRow[];
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __timelineHarness?: TimelineHarnessRemote;
  }
}

interface SnapshotShape {
  svgResult?: { svg: string; linear: TimeRow[] };
  step?: number;
  playback?: string;
}

export function mountTimeline(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new TimelineEngine());

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = {
    locale: 'en' as const,
    tokens: {},
    reducedMotion: false,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 200) {
        emitted.push({ seq: event.seq, name: event.name, action: event.action });
      }
    },
    resolveAsset: (id: string) => id,
  };

  const engine = new TimelineEngine();
  const instance = engine.instantiate(INDEPENDENCE_SPEC as never, host, 'timeline-independence');

  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'timeline');
  app.appendChild(svgContainer);

  const linearList = document.createElement('ol');
  linearList.setAttribute('aria-label', 'Timeline events chronological list');
  app.appendChild(linearList);

  let latest: SnapshotShape = {};

  function renderDom(): void {
    const snap = instance.snapshot() as SnapshotShape;
    latest = snap;
    svgContainer.innerHTML = snap.svgResult?.svg ?? '';
    const linear = snap.svgResult?.linear ?? [];

    linearList.innerHTML = '';
    for (const row of linear) {
      const li = document.createElement('li');
      li.setAttribute('data-event-id', row.id);
      li.textContent = row.kind === 'event'
        ? `${row.label}${row.date ? ` (${row.date})` : ''}${row.trackId ? ` [${row.trackId}]` : ''}`
        : `${row.label}${row.from ? ` (${row.from} – ${row.to})` : ''}`;
      if (row.kind === 'event') {
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.addEventListener('click', () => {
          instance.dispatch({ type: 'select', target: { id: row.id } } as EngineAction);
          renderDom();
        });
      }
      linearList.appendChild(li);
    }
  }

  renderDom();

  window.__timelineHarness = {
    dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void {
      instance.dispatch(action as EngineAction);
      renderDom();
    },
    snapshot(): unknown {
      return instance.snapshot();
    },
    events() {
      return [...emitted];
    },
    svg(): string {
      return latest.svgResult?.svg ?? '';
    },
    linear(): TimeRow[] {
      return latest.svgResult?.linear ?? [];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      try {
        const r = new TimelineEngine().validate(spec as never);
        return { ok: r.valid, code: r.valid ? undefined : (r.issues[0]?.code ?? 'INVALID_SPEC'), message: r.issues.map((i: { message: string }) => i.message).join('; ') };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
}