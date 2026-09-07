import { describe, expect, it } from 'vitest';
import { EngineError } from '@knowledgeassemble/interactive-engine';
import { buildScene } from '../src/scene/build.js';

const BAR_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20 },
    { id: 'row-may', month: 'May', rainfall: 110 },
  ],
} as never;

const LINE_INPUT = {
  kind: 'line',
  dimensions: [{ id: 'year', type: 'ordinal' }],
  measures: [{ id: 'temp', type: 'quantitative', unit: 'C' }],
  data: [
    { id: 'y1', year: '2000', temp: 15 },
    { id: 'y2', year: '2001', temp: 17 },
    { id: 'y3', year: '2002', temp: 16 },
  ],
} as never;

describe('buildScene', () => {
  it('builds a bar scene with (rows × measures) bar nodes', () => {
    const scene = buildScene(BAR_INPUT);
    const bars = scene.nodes.filter((n) => n.kind === 'bar');
    expect(bars.length).toBe(2);
    expect(bars[0]!.id).toBe('rainfall-bar-row-jan');
    expect(bars[0]!.interactive).toBe(true);
    expect(bars[0]!.acceptsActions).toEqual(['select', 'focus']);
    expect(bars[0]!.value).toBe(20);
    expect(bars[0]!.label).toBe('Jan: 20 mm');
    expect(bars[1]!.label).toBe('May: 110 mm');
  });

  it('builds a line scene with point nodes per data row', () => {
    const scene = buildScene(LINE_INPUT);
    const points = scene.nodes.filter((n) => n.kind === 'point');
    expect(points.length).toBe(3);
    expect(points[0]!.id).toBe('temp-point-y1');
    expect(points[1]!.id).toBe('temp-point-y2');
    expect(points[2]!.id).toBe('temp-point-y3');
  });

  it('includes axis-x and axis-y scaffold nodes', () => {
    const scene = buildScene(BAR_INPUT);
    const axes = scene.nodes.filter((n) => n.role === 'axis');
    expect(axes.length).toBe(2);
    expect(axes[0]!.id).toBe('axis-x');
    expect(axes[1]!.id).toBe('axis-y');
  });

  it('throws on duplicate row id', () => {
    let caught: EngineError | null = null;
    try {
      buildScene({
        kind: 'bar',
        dimensions: [{ id: 'x', type: 'ordinal' }],
        measures: [{ id: 'y', type: 'quantitative' }],
        data: [
          { id: 'dup', x: 'a', y: 1 },
          { id: 'dup', x: 'b', y: 2 },
        ],
      } as never);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_ENTITY');
  });

  it('throws on undeclared key in a row', () => {
    let caught: EngineError | null = null;
    try {
      buildScene({
        kind: 'bar',
        dimensions: [{ id: 'x', type: 'ordinal' }],
        measures: [{ id: 'y', type: 'quantitative' }],
        data: [{ id: 'r1', x: 'a', y: 1, foo: 'bad' }],
      } as never);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_ENTITY');
  });
});