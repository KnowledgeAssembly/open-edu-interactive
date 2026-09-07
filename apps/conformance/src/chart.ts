import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import type { EngineAction } from '@knowledgeassemble/interactive-engine';

const RAINFALL_SPEC = {
  type: 'chart',
  version: '1.0.0',
  id: 'rainfall-monthly',
  metadata: { title: 'Monthly rainfall' },
  purpose: { learningObjective: 'Compare rainfall across months', reasoningMode: 'compare' },
  content: {
    kind: 'bar',
    dimensions: [{ id: 'month', type: 'ordinal' }],
    measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
    data: [
      { id: 'row-feb', month: 'Feb', rainfall: 45 },
      { id: 'row-may', month: 'May', rainfall: 110 },
      { id: 'row-aug', month: 'Aug', rainfall: 80 },
      { id: 'row-nov', month: 'Nov', rainfall: 30 },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'focus', 'filter', 'reset'] },
  questions: [],
  sources: [{ class: 'authoritative' }],
  accessibility: { label: 'Bar chart of monthly rainfall in millimeters' },
};

interface TabularRow {
  rowLabel: string;
  values: Array<{ measureId: string; value: number | null; unit?: string }>;
}

interface ChartHarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  svg(): string;
  tabular(): TabularRow[];
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __chartHarness?: ChartHarnessRemote;
  }
}

interface SnapshotShape {
  svgResult?: { svg: string; tabular: TabularRow[] };
}

export function mountChart(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new ChartEngine());

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

  const engine = new ChartEngine();
  const instance = engine.instantiate(RAINFALL_SPEC as never, host, 'rainfall-monthly');

  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'chart');
  app.appendChild(svgContainer);

  const table = document.createElement('table');
  table.setAttribute('aria-label', 'Chart data table');
  app.appendChild(table);

  let latest: SnapshotShape = {};

  function renderDom(): void {
    const snap = instance.snapshot() as SnapshotShape;
    latest = snap;
    svgContainer.innerHTML = snap.svgResult?.svg ?? '';
    const tabularData = snap.svgResult?.tabular ?? [];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thRow = document.createElement('th');
    thRow.textContent = 'Category';
    headerRow.appendChild(thRow);
    const thVal = document.createElement('th');
    thVal.textContent = 'Value';
    headerRow.appendChild(thVal);
    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    for (const row of tabularData) {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.textContent = row.rowLabel;
      tr.appendChild(tdLabel);
      const tdVal = document.createElement('td');
      tdVal.textContent = String(row.values[0]?.value ?? '');
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
    table.replaceChildren(thead, tbody);
  }

  renderDom();

  window.__chartHarness = {
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
    tabular(): TabularRow[] {
      return latest.svgResult?.tabular ?? [];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      try {
        const r = new ChartEngine().validate(spec as never);
        return { ok: r.valid, message: r.issues.map((i: { message: string }) => i.message).join('; ') };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
}