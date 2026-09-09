import { describe, expect, it } from 'vitest';
import { EngineError } from '@knowledgeassemble/interactive-engine';
import { createNumberLine } from '../src/components/number-line.js';
import { createCountingSet, countingSetComponent } from '../src/components/counting-set.js';
import { createFractionBar, fractionBarComponent } from '../src/components/fraction-bar.js';
import { createFractionComparison, fractionComparisonComponent } from '../src/components/fraction-circle.js';
import { createClock, clockComponent } from '../src/components/clock.js';
import { createCoordinateGrid, coordinateGridComponent } from '../src/components/coordinate-grid.js';
import { geometryShapeComponent } from '../src/components/geometry-shape.js';
import { createComparison, comparisonComponent } from '../src/components/comparison.js';

describe('number-line', () => {
  it('creates ticks and markers', () => {
    const nodes = createNumberLine({ min: 0, max: 3, step: 1, highlight: [2] }, 'nl');
    expect(nodes.filter(n => n.role === 'tick').length).toBe(4);
    expect(nodes.filter(n => n.role === 'marker').length).toBe(1);
  });

  it('rejects invalid range', () => {
    expect(() => createNumberLine({ min: 5, max: 0, step: 1 }, 'nl')).toThrow(EngineError);
  });

  it('produces deterministic ids', () => {
    const a = createNumberLine({ min: 0, max: 2, step: 1 }, 'nl');
    const b = createNumberLine({ min: 0, max: 2, step: 1 }, 'nl');
    expect(a.map(n => n.id)).toEqual(b.map(n => n.id));
  });
});

describe('counting-set', () => {
  it('creates correct number of objects', () => {
    const nodes = createCountingSet({ count: 5, object: 'circle', arrangement: 'row' }, 'cs');
    expect(nodes.filter(n => n.role === 'counting-object').length).toBe(5);
  });

  it('rejects zero count', () => {
    expect(() => createCountingSet({ count: 0, object: 'circle', arrangement: 'row' }, 'cs')).toThrow(EngineError);
  });

  it('is registered as kind counting-set', () => {
    expect(countingSetComponent.kind).toBe('counting-set');
  });
});

describe('fraction-bar', () => {
  it('creates parts', () => {
    const nodes = createFractionBar({ numerator: 3, denominator: 4 }, 'fb');
    const barGroup = nodes.find(n => n.id === 'fb-bar');
    expect(barGroup?.children.filter(n => n.role === 'fraction-part').length).toBe(4);
  });

  it('highlights parts', () => {
    const nodes = createFractionBar({ numerator: 3, denominator: 4, highlightedParts: [0, 2] }, 'fb');
    const barNode = nodes.find(n => n.role === 'group');
    const highlighted = (barNode?.children ?? []).filter(n => n.interactive);
    expect(highlighted.length).toBe(2);
  });

  it('rejects invalid denominator', () => {
    expect(() => createFractionBar({ numerator: 1, denominator: 0 }, 'fb')).toThrow(EngineError);
  });

  it('is registered as kind fraction', () => {
    expect(fractionBarComponent.kind).toBe('fraction');
  });
});

describe('fraction-circle', () => {
  it('creates two comparison items', () => {
    const nodes = createFractionComparison({
      items: [{ id: 'a', label: '1/2', value: 0.5 }, { id: 'b', label: '1/4', value: 0.25 }],
      comparison: 'greater-than',
      interactive: true,
    }, 'fc');
    expect(nodes.filter(n => n.role === 'selectable').length).toBe(2);
  });

  it('is registered as kind fraction-comparison', () => {
    expect(fractionComparisonComponent.kind).toBe('fraction-comparison');
  });
});

describe('clock', () => {
  it('creates face and hands', () => {
    const nodes = createClock({ hour: 3, minute: 30 }, 'cl');
    expect(nodes.filter(n => n.kind === 'line').length).toBeGreaterThanOrEqual(2);
    expect(nodes.filter(n => n.role === 'marker').length).toBeGreaterThanOrEqual(2);
  });

  it('creates number labels by default', () => {
    const nodes = createClock({ hour: 3, minute: 30 }, 'cl');
    expect(nodes.filter(n => n.role === 'number').length).toBe(12);
  });

  it('is registered as kind clock', () => {
    expect(clockComponent.kind).toBe('clock');
  });
});

describe('coordinate-grid', () => {
  it('creates axes and gridlines', () => {
    const nodes = createCoordinateGrid({
      x: { min: -1, max: 1, step: 0.5 },
      y: { min: -1, max: 1, step: 0.5 },
    }, 'cg');
    expect(nodes.filter(n => n.role === 'axis').length).toBe(2);
  });

  it('rejects invalid axis', () => {
    expect(() => createCoordinateGrid({ x: { min: 1, max: 0, step: 1 }, y: { min: 0, max: 1, step: 1 } }, 'cg')).toThrow(EngineError);
  });

  it('is registered as kind coordinate-grid', () => {
    expect(coordinateGridComponent.kind).toBe('coordinate-grid');
  });
});

describe('geometry', () => {
  it('creates shape group', () => {
    const nodes = geometryShapeComponent.create({ shape: 'triangle' }, 'gs');
    expect(nodes[0]?.role).toBe('shape');
  });

  it('is registered as kind geometry', () => {
    expect(geometryShapeComponent.kind).toBe('geometry');
  });
});

describe('comparison', () => {
  it('creates items', () => {
    const nodes = createComparison({
      items: [{ id: 'a', label: '5', value: 5 }, { id: 'b', label: '3', value: 3 }],
      comparison: 'greater-than',
      interactive: true,
    }, 'comp');
    expect(nodes.filter(n => n.role === 'selectable').length).toBe(2);
  });

  it('is registered as kind comparison', () => {
    expect(comparisonComponent.kind).toBe('comparison');
  });
});