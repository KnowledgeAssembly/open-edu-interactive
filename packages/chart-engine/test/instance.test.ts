import { describe, expect, it } from 'vitest';
import { ChartEngine } from '../src/engine.js';
import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import type { EngineHost, EngineAction } from '@knowledgeassemble/interactive-engine';

function stubHost() {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: () => '',
  };
}

function collectingHost() {
  const events: Array<{ name: string }> = [];
  const host: EngineHost = {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: (e) => { events.push(e); },
    resolveAsset: () => '',
  };
  return { host, events };
}

const BAR_SPEC = {
  type: 'chart',
  version: '1.0.0',
  id: 'chart-test',
  content: {
    kind: 'bar',
    dimensions: [{ id: 'month', type: 'ordinal' }],
    measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
    data: [
      { id: 'row-jan', month: 'Jan', rainfall: 20 },
      { id: 'row-may', month: 'May', rainfall: 110 },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'focus', 'reset'] },
  accessibility: { label: 'Bar chart' },
  sources: [{ class: 'authoritative' as const }],
};

const LINE_SPEC = {
  type: 'chart',
  version: '1.0.0',
  id: 'line-test',
  content: {
    kind: 'line',
    dimensions: [{ id: 'year', type: 'ordinal' }],
    measures: [{ id: 'temp', type: 'quantitative', unit: 'C' }],
    data: [
      { id: 'y1', year: '2000', temp: 15 },
      { id: 'y2', year: '2001', temp: 17 },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'focus', 'reset'] },
  accessibility: { label: 'Line chart' },
  sources: [{ class: 'authoritative' as const }],
};

describe('ChartEngine', () => {
  it('registers in EngineRegistry', () => {
    const registry = new EngineRegistry();
    const engine = new ChartEngine();
    registry.register(engine);
    expect(registry.get('chart')).toBe(engine);
  });

  it('validates a correct bar spec', () => {
    const engine = new ChartEngine();
    const result = engine.validate(BAR_SPEC as never);
    expect(result.valid).toBe(true);
  });

  it('validates a correct line spec', () => {
    const engine = new ChartEngine();
    const result = engine.validate(LINE_SPEC as never);
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown content.kind "scatter"', () => {
    const engine = new ChartEngine();
    const result = engine.validate({ ...BAR_SPEC, content: { ...BAR_SPEC.content, kind: 'scatter' } } as never);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_ENTITY');
  });

  it('rejects a line chart with 1 data point (Chart-D4)', () => {
    const engine = new ChartEngine();
    const result = engine.validate({
      ...LINE_SPEC,
      content: { ...LINE_SPEC.content, data: [{ id: 'y1', year: '2000', temp: 15 }] },
    } as never);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('dispatch select on a bar updates snapshot selection and emits namespaced event', () => {
    const engine = new ChartEngine();
    const { host, events } = collectingHost();
    const instance = engine.instantiate(BAR_SPEC as never, host, 'chart-test');

    instance.dispatch({ type: 'select', target: { id: 'rainfall-bar-row-jan' } } as EngineAction);

    expect(instance.snapshot().selection).toContain('rainfall-bar-row-jan');
    const nsEvent = events.find((e) => e.name.startsWith('chart.'));
    expect(nsEvent).toBeDefined();
    expect(nsEvent!.name).toBe('chart.data-point-selected');
  });

  it('dispatch focus emits chart.data-point-focused with row payload', () => {
    const engine = new ChartEngine();
    const { host, events } = collectingHost();
    const instance = engine.instantiate(BAR_SPEC as never, host, 'chart-focus');

    instance.dispatch({ type: 'focus', target: { id: 'rainfall-bar-row-may' } } as EngineAction);

    const nsEvent = events.find((e) => e.name === 'chart.data-point-focused');
    expect(nsEvent).toBeDefined();
    expect((nsEvent as unknown as { action?: { payload?: unknown } }).action?.payload).toBeDefined();
  });

  it('instantiate creates a running instance with scene and svgResult', () => {
    const engine = new ChartEngine();
    const instance = engine.instantiate(BAR_SPEC as never, stubHost());
    const snap = instance.snapshot() as unknown as { phase: string; scene: unknown; svgResult: unknown };
    expect(snap.phase).toBe('running');
    expect(snap.scene).toBeDefined();
    expect(snap.svgResult).toBeDefined();
  });

  it('teardown cleans up', () => {
    const engine = new ChartEngine();
    const instance = engine.instantiate(BAR_SPEC as never, stubHost());
    instance.teardown();
  });

  it('filter restricts rendered rows to the id subset and clear-filter restores all', () => {
    const engine = new ChartEngine();
    const { host } = collectingHost();
    const instance = engine.instantiate(BAR_SPEC as never, host, 'chart-filter');

    const all = (instance.snapshot() as unknown as { tabular: Array<{ rowLabel: string }> }).tabular;
    expect(all.map((r) => r.rowLabel)).toEqual(['Jan', 'May']);

    instance.dispatch({ type: 'filter', payload: { ids: ['row-jan'] } } as EngineAction);
    const filtered = (instance.snapshot() as unknown as { tabular: Array<{ rowLabel: string }> }).tabular;
    expect(filtered.map((r) => r.rowLabel)).toEqual(['Jan']);
    expect((instance.snapshot() as unknown as { filter: string[] }).filter).toEqual(['row-jan']);

    instance.dispatch({ type: 'clear-filter' } as EngineAction);
    const restored = (instance.snapshot() as unknown as { tabular: Array<{ rowLabel: string }> }).tabular;
    expect(restored).toHaveLength(2);
  });

  it('filter with an empty id list renders no rows (literal subset semantics)', () => {
    const engine = new ChartEngine();
    const { host } = collectingHost();
    const instance = engine.instantiate(BAR_SPEC as never, host, 'chart-filter-empty');

    instance.dispatch({ type: 'filter', payload: { ids: [] } } as EngineAction);
    const snapshot = instance.snapshot() as unknown as { tabular: Array<{ rowLabel: string }> };
    expect(snapshot.tabular).toEqual([]);
  });

  it('filter does not emit a chart.* result event (select/focus only)', () => {
    const engine = new ChartEngine();
    const { host, events } = collectingHost();
    const instance = engine.instantiate(BAR_SPEC as never, host, 'chart-filter-events');

    instance.dispatch({ type: 'filter', payload: { ids: ['row-jan'] } } as EngineAction);
    expect(events.filter((e) => e.name.startsWith('chart.'))).toEqual([]);
  });
});