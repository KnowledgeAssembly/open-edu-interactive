import { describe, expect, it } from 'vitest';
import { ChartEngine } from '../src/engine.js';

function makeSpec(overrides: Record<string, unknown>) {
  return {
    type: 'chart',
    version: '1.0.0',
    id: 'validation-test',
    content: {
      kind: 'bar',
      dimensions: [{ id: 'month', type: 'ordinal' }],
      measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
      data: [
        { id: 'row-jan', month: 'Jan', rainfall: 20 },
        { id: 'row-may', month: 'May', rainfall: 110 },
      ],
      ...(overrides.content as Record<string, unknown>),
    },
    interaction: { mode: 'explore', actions: ['select', 'focus', 'reset'] },
    accessibility: { label: 'Test chart' },
    sources: [{ class: 'authoritative' }],
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== 'content')),
  };
}

describe('ChartEngine validation', () => {
  it('validates a correct spec (bar, 2 rows, sources present)', () => {
    const engine = new ChartEngine();
    const result = engine.validate(makeSpec({}) as never);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects kind "scatter" with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(makeSpec({ content: { kind: 'scatter' } }) as never);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('rejects a row with undeclared key with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          data: [
            { id: 'r1', month: 'Jan', rainfall: 20, invented: 42 },
            { id: 'r2', month: 'May', rainfall: 110 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('rejects missing sources with INVALID_SPEC', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({ noSources: true, sources: undefined }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC')).toBe(true);
  });

  it('rejects a 1-point line chart with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          kind: 'line',
          data: [{ id: 'r1', month: 'Jan', rainfall: 20 }],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('rejects a source with an out-of-provenance class with INVALID_SPEC', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({ sources: [{ class: 'reference' }] }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC')).toBe(true);
  });

  it('rejects a non-numeric measure value with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          data: [
            { id: 'r1', month: 'Jan', rainfall: 20 },
            { id: 'r2', month: 'May', rainfall: 'heavy' },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('rejects a numeric categorical value with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          data: [
            { id: 'r1', month: 1, rainfall: 20 },
            { id: 'r2', month: 'May', rainfall: 110 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('accepts an ISO-8601 time dimension value', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          kind: 'line',
          dimensions: [{ id: 'when', type: 'time' }],
          measures: [{ id: 'reading', type: 'quantitative' }],
          data: [
            { id: 't1', when: '2024-01-01', reading: 1 },
            { id: 't2', when: '2024-06-15T12:00:00Z', reading: 2 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a non-ISO-8601 time string with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          kind: 'line',
          dimensions: [{ id: 'when', type: 'time' }],
          measures: [{ id: 'reading', type: 'quantitative' }],
          data: [
            { id: 't1', when: 'winter', reading: 1 },
            { id: 't2', when: '2024-06-15T12:00:00Z', reading: 2 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('rejects a non-D5 interaction action (envelope L1, D5 set)', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        interaction: { mode: 'explore', actions: ['select', 'click'] },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('click'))).toBe(true);
  });

  it('rejects a link to an undeclared row id with INVALID_REFERENCE', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          data: [
            { id: 'r1', month: 'Jan', rainfall: 20, links: { related: 'nope' } },
            { id: 'r2', month: 'May', rainfall: 110 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE')).toBe(true);
  });

  it('accepts forward links between row ids', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({
        content: {
          data: [
            { id: 'r1', month: 'Jan', rainfall: 20, links: { related: 'r2' } },
            { id: 'r2', month: 'May', rainfall: 110 },
          ],
        },
      }) as never,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a spec with no measures at L2 with INVALID_ENTITY', () => {
    const engine = new ChartEngine();
    const result = engine.validate(
      makeSpec({ content: { measures: [] } }) as never,
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });
});