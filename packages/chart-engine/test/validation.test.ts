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
    sources: [{ type: 'authoritative' }],
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
});