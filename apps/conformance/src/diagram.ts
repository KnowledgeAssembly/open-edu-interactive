import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';
import type { EngineAction } from '@knowledgeassemble/interactive-engine';

const WATER_CYCLE_SPEC = {
  type: 'diagram',
  version: '1.0.0',
  id: 'water-cycle',
  metadata: { title: 'Water cycle' },
  purpose: { learningObjective: 'Understand how water moves through the cycle', reasoningMode: 'explore' },
  content: {
    kind: 'cycle',
    profile: 'process',
    nodes: [
      { id: 'evaporation', label: 'Evaporation', description: 'Liquid becomes vapour', links: { visualEntityId: 'water-figure' } },
      { id: 'condensation', label: 'Condensation' },
      { id: 'precipitation', label: 'Precipitation' },
      { id: 'collection', label: 'Collection' },
    ],
    edges: [
      { from: 'evaporation', to: 'condensation', relationship: 'leads-to' },
      { from: 'condensation', to: 'precipitation', relationship: 'leads-to' },
      { from: 'precipitation', to: 'collection', relationship: 'leads-to' },
      { from: 'collection', to: 'evaporation', relationship: 'leads-to' },
    ],
  },
  layout: { type: 'radial' },
  interaction: { mode: 'explore', actions: ['select', 'deselect', 'focus', 'expand', 'collapse', 'follow', 'reset'] },
  questions: [],
  sources: [{ class: 'illustrative' }],
  accessibility: { label: 'Water cycle diagram: evaporation, condensation, precipitation, collection.' },
};

interface RelRow {
  kind: string;
  id: string;
  label?: string;
  from?: string;
  relationship?: string;
  to?: string;
  fromLabel?: string;
  toLabel?: string;
  members?: string[];
  nodeId?: string;
  description?: string;
}

interface DiagramHarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  svg(): string;
  alternative(): RelRow[];
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __diagramHarness?: DiagramHarnessRemote;
  }
}

interface SnapshotShape {
  svgResult?: { svg: string; alternative: RelRow[] };
  selection?: string[];
  expanded?: string[];
}

export function mountDiagram(app: HTMLElement): void {
  const registry = new EngineRegistry();
  registry.register(new DiagramEngine());

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: (msg: string) => console.log('[announce]', msg),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 200) {
        emitted.push({ seq: event.seq, name: event.name, action: event.action });
      }
    },
    resolveAsset: (id: string) => id,
  };

  const engine = new DiagramEngine();
  const instance = engine.instantiate(WATER_CYCLE_SPEC as never, host, 'water-cycle-conformance');

  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'diagram');
  app.appendChild(svgContainer);

  const alternativeList = document.createElement('table');
  alternativeList.setAttribute('aria-label', 'Diagram relationship list');
  app.appendChild(alternativeList);

  let latest: SnapshotShape = {};

  function renderDom(): void {
    const snap = instance.snapshot() as SnapshotShape;
    latest = snap;
    svgContainer.innerHTML = snap.svgResult?.svg ?? '';
    const rows = snap.svgResult?.alternative ?? [];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thKind = document.createElement('th');
    thKind.textContent = 'Kind';
    headerRow.appendChild(thKind);
    const thFrom = document.createElement('th');
    thFrom.textContent = 'From';
    headerRow.appendChild(thFrom);
    const thRel = document.createElement('th');
    thRel.textContent = 'Relationship';
    headerRow.appendChild(thRel);
    const thTo = document.createElement('th');
    thTo.textContent = 'To';
    headerRow.appendChild(thTo);
    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row-id', row.id);
      const tdKind = document.createElement('td');
      tdKind.textContent = row.kind;
      tr.appendChild(tdKind);
      if (row.kind === 'edge') {
        const tdFrom = document.createElement('td');
        tdFrom.textContent = row.fromLabel ?? row.from ?? '';
        tr.appendChild(tdFrom);
        const tdRel = document.createElement('td');
        tdRel.textContent = row.relationship ?? '';
        tr.appendChild(tdRel);
        const tdTo = document.createElement('td');
        tdTo.textContent = row.toLabel ?? row.to ?? '';
        tr.appendChild(tdTo);
      } else if (row.kind === 'cycle') {
        const tdFrom = document.createElement('td');
        tdFrom.textContent = '—';
        tr.appendChild(tdFrom);
        const tdRel = document.createElement('td');
        tdRel.textContent = `Cycle: ${row.members?.join(' → ') ?? ''}`;
        tr.appendChild(tdRel);
        const tdTo = document.createElement('td');
        tdTo.textContent = '—';
        tr.appendChild(tdTo);
      } else {
        const tdFrom = document.createElement('td');
        tdFrom.textContent = row.label ?? '';
        tr.appendChild(tdFrom);
        const tdRel = document.createElement('td');
        tdRel.textContent = '—';
        tr.appendChild(tdRel);
        const tdTo = document.createElement('td');
        tdTo.textContent = '—';
        tr.appendChild(tdTo);
      }
      tbody.appendChild(tr);
    }
    alternativeList.replaceChildren(thead, tbody);
  }

  renderDom();

  window.__diagramHarness = {
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
    alternative(): RelRow[] {
      return latest.svgResult?.alternative ?? [];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      try {
        const r = new DiagramEngine().validate(spec as never);
        const first = r.issues[0];
        return { ok: r.valid, code: first?.code, message: r.issues.map((i) => i.message).join('; ') };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
}