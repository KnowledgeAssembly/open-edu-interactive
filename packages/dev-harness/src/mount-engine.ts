import type { EngineAction, EngineEvent, EngineSpec, EngineType, ValidationResult } from '@knowledgeassemble/interactive-engine';
import {
  bindSvgInteraction,
  syncSvgSurface,
} from '@knowledgeassemble/interactive-react/svg-surface';
import type { SvgSurfaceSnapshot } from '@knowledgeassemble/interactive-react/svg-surface';
import { getEngine } from './engine-registry.js';
import type { StubHostOptions } from './stub-host.js';
import { createStubHost } from './stub-host.js';
import type { EngineMountResult, RenderTarget } from './types.js';

interface SvgSnapshot extends SvgSurfaceSnapshot {
  svgResult?: { svg?: string; tabular?: unknown[]; alternative?: unknown[]; linear?: unknown[] };
}

interface TimeRow {
  kind: string;
  id: string;
  label: string;
  date?: string;
  from?: string;
  to?: string;
  trackId?: string;
}

interface TabularRow {
  rowLabel: string;
  values: Array<{ measureId: string; value: number | null; unit?: string }>;
}

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
}

function renderChartTable(container: HTMLElement, rows: TabularRow[]): void {
  const table = document.createElement('table');
  table.setAttribute('aria-label', 'Chart data table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of ['Category', 'Value']) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = row.rowLabel;
    tr.appendChild(tdLabel);
    const tdVal = document.createElement('td');
    tdVal.textContent = String(row.values[0]?.value ?? '');
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.replaceChildren(table);
}

function renderRelTable(container: HTMLElement, rows: RelRow[]): void {
  const table = document.createElement('table');
  table.setAttribute('aria-label', 'Diagram relationship list');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of ['Kind', 'From', 'Relationship', 'To']) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
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
  table.appendChild(tbody);
  container.replaceChildren(table);
}

function renderTimelineLinear(
  list: HTMLElement,
  rows: TimeRow[],
  dispatch: (action: EngineAction) => void,
): void {
  list.setAttribute('aria-label', 'Timeline events chronological list');
  list.replaceChildren();
  for (const row of rows) {
    const li = document.createElement('li');
    li.setAttribute('data-event-id', row.id);
    li.textContent = row.kind === 'event'
      ? `${row.label}${row.date ? ` (${row.date})` : ''}${row.trackId ? ` [${row.trackId}]` : ''}`
      : `${row.label}${row.from ? ` (${row.from} – ${row.to})` : ''}`;
    if (row.kind === 'event') {
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', () => {
        dispatch({ type: 'select', target: { id: row.id } });
      });
    }
    list.appendChild(li);
  }
}

function renderEntityList(container: HTMLElement, entities: Array<{ entityId?: string; name?: string; type?: string; description?: string; location?: string }>): void {
  const list = document.createElement('ul');
  list.setAttribute('aria-label', 'Entity list');
  for (const ent of entities) {
    const li = document.createElement('li');
    li.textContent = `${ent.name ?? ent.entityId ?? ''} (${ent.type ?? ''})${ent.description ? ': ' + ent.description : ''} — ${ent.location ?? ''}`;
    list.appendChild(li);
  }
  container.replaceChildren(list);
}

export function mountEngine(
  spec: EngineSpec,
  container: HTMLElement,
  opts?: { host?: StubHostOptions; instanceId?: string },
): EngineMountResult {
  const { host, events, clearEvents } = createStubHost(opts?.host);
  const engine = getEngine(spec.type as EngineType);
  const instanceId = opts?.instanceId ?? spec.id;
  const instance = engine.instantiate(spec, host, instanceId);

  const svgRoot = document.createElement('div');
  svgRoot.setAttribute('data-oedu-root', spec.type);
  const svgContent = document.createElement('div');
  svgContent.setAttribute('data-oedu-svg', spec.type);
  svgRoot.appendChild(svgContent);
  container.appendChild(svgRoot);

  let tabularRoot: HTMLElement | undefined;
  let alternativeRoot: HTMLElement | undefined;
  let linearRoot: HTMLElement | undefined;

  const snapshot = instance.snapshot() as SvgSnapshot;
  const svgResult = snapshot.svgResult;

  if (spec.type === 'timeline' && svgResult?.linear && svgResult.linear.length > 0) {
    linearRoot = document.createElement('ol');
    container.appendChild(linearRoot);
  }

  if (spec.type === 'chart' && svgResult?.tabular && svgResult.tabular.length > 0) {
    tabularRoot = document.createElement('div');
    tabularRoot.setAttribute('data-oedu-tabular', 'chart');
    container.appendChild(tabularRoot);
  }

  if (spec.type === 'diagram' && svgResult?.alternative && svgResult.alternative.length > 0) {
    alternativeRoot = document.createElement('div');
    alternativeRoot.setAttribute('data-oedu-alternative', 'diagram');
    container.appendChild(alternativeRoot);
  }

  if (spec.type === 'geomap' && svgResult?.alternative && svgResult.alternative.length > 0) {
    alternativeRoot = document.createElement('div');
    alternativeRoot.setAttribute('data-oedu-alternative', 'geomap');
    container.appendChild(alternativeRoot);
  }

  const renderTargets: RenderTarget[] = [{ container: svgRoot, kind: 'svg' }];
  if (tabularRoot) renderTargets.push({ container: tabularRoot, kind: 'tabular' });
  if (alternativeRoot) renderTargets.push({ container: alternativeRoot, kind: 'alternative' });

  function renderDom(): void {
    const snap = instance.snapshot() as SvgSnapshot;
    syncSvgSurface(svgContent, snap);
    if (tabularRoot) {
      renderChartTable(tabularRoot, (snap.svgResult?.tabular ?? []) as TabularRow[]);
    }
    if (alternativeRoot) {
      const alt = snap.svgResult?.alternative;
      if (spec.type === 'diagram' && alt) {
        renderRelTable(alternativeRoot, alt as RelRow[]);
      } else if (spec.type === 'geomap' && alt) {
        renderEntityList(alternativeRoot, alt as Array<{ entityId?: string; name?: string; type?: string; description?: string; location?: string }>);
      }
    }
    if (linearRoot) {
      renderTimelineLinear(linearRoot, (snap.svgResult?.linear ?? []) as TimeRow[], dispatchAndRender);
    }
  }

  function dispatchAndRender(action: EngineAction): void {
    instance.dispatch(action);
    renderDom();
  }

  const unbindSvg = bindSvgInteraction(svgRoot, dispatchAndRender);

  renderDom();

  return {
    instanceId,
    dispatch(action: EngineAction): void {
      dispatchAndRender(action);
    },
    snapshot(): unknown {
      return instance.snapshot();
    },
    events(): readonly EngineEvent[] {
      return events() as readonly EngineEvent[];
    },
    validate(spec: unknown): ValidationResult {
      return engine.validate(spec as EngineSpec);
    },
    teardown(): void {
      unbindSvg();
      instance.teardown();
      clearEvents();
    },
    renderTargets,
  };
}