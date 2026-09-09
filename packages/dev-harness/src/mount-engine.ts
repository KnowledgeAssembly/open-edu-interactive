import type { EngineAction, EngineEvent, EngineSpec, EngineType, ValidationResult } from '@knowledgeassemble/interactive-engine';
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
import { getEngine } from './engine-registry.js';
import type { StubHostOptions } from './stub-host.js';
import { createStubHost } from './stub-host.js';
import type { EngineMountResult, RenderTarget } from './types.js';

interface SvgSnapshot {
  svgResult?: { svg?: string; tabular?: unknown[]; alternative?: unknown[] };
}

function renderSvg(container: HTMLElement, svg: string | undefined): void {
  container.innerHTML = svg ?? '';
}

function renderTable(container: HTMLElement, rows: unknown[], columns: string[]): void {
  const table = document.createElement('table');
  table.setAttribute('aria-label', 'Data table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of columns) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of columns) {
      const td = document.createElement('td');
      td.textContent = String((row as Record<string, unknown>)[col] ?? '');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.replaceChildren(table);
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
  container.appendChild(svgRoot);

  let tabularRoot: HTMLElement | undefined;
  let alternativeRoot: HTMLElement | undefined;

  const snapshot = instance.snapshot() as SvgSnapshot;
  const svgResult = snapshot.svgResult;

  if (spec.type === 'chart' && svgResult?.tabular && svgResult.tabular.length > 0) {
    tabularRoot = document.createElement('div');
    tabularRoot.setAttribute('data-oedu-tabular', 'chart');
    container.appendChild(tabularRoot);
    renderTable(tabularRoot, svgResult.tabular as unknown[], ['Category', 'Value']);
  }

  if ((spec.type === 'geomap' || spec.type === 'diagram') && svgResult?.alternative && svgResult.alternative.length > 0) {
    alternativeRoot = document.createElement('div');
    alternativeRoot.setAttribute('data-oedu-alternative', spec.type);
    container.appendChild(alternativeRoot);
    renderEntityList(alternativeRoot, svgResult.alternative as Array<{ entityId?: string; name?: string; type?: string; description?: string; location?: string }>);
  }

  const renderTargets: RenderTarget[] = [{ container: svgRoot, kind: 'svg' }];
  if (tabularRoot) renderTargets.push({ container: tabularRoot, kind: 'tabular' });
  if (alternativeRoot) renderTargets.push({ container: alternativeRoot, kind: 'alternative' });

  function renderDom(): void {
    const snap = instance.snapshot() as SvgSnapshot;
    renderSvg(svgRoot, snap.svgResult?.svg);
    if (tabularRoot) {
      renderTable(tabularRoot, (snap.svgResult?.tabular ?? []) as unknown[], ['Category', 'Value']);
    }
    if (alternativeRoot) {
      renderEntityList(alternativeRoot, (snap.svgResult?.alternative ?? []) as Array<{ entityId?: string; name?: string; type?: string; description?: string; location?: string }>);
    }
  }

  return {
    instanceId,
    dispatch(action: EngineAction): void {
      instance.dispatch(action);
      renderDom();
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
      instance.teardown();
      clearEvents();
    },
    renderTargets,
  };
}