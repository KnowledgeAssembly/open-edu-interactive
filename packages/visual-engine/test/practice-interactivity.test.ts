import { describe, expect, it } from 'vitest';
import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../src/scene/types.js';
import { createNumberLine } from '../src/components/number-line.js';
import { createCountingSet } from '../src/components/counting-set.js';
import { createFractionBar } from '../src/components/fraction-bar.js';
import { createClock } from '../src/components/clock.js';
import { createCoordinateGrid } from '../src/components/coordinate-grid.js';
import { geometryShapeComponent } from '../src/components/geometry-shape.js';
import { createFractionCircleSectors } from '../src/components/fraction-circle-sectors.js';

function collectInteractive(n: SceneNode): string[] {
  const self = n.interactive ? [n.id] : [];
  return [...self, ...n.children.flatMap(collectInteractive)];
}

function interactiveIds(nodes: SceneNode[]): string[] {
  return nodes.flatMap(collectInteractive).sort();
}

describe('number-line practice', () => {
  it('guided: only highlight markers are interactive', () => {
    const nodes = createNumberLine({ min: 0, max: 3, step: 1, highlight: [2] }, 'nl');
    expect(interactiveIds(nodes)).toEqual(['nl-marker-2']);
  });

  it('discovery: all step markers interactive when interactive true', () => {
    const nodes = createNumberLine(
      { min: 0, max: 3, step: 1, interactive: true, highlight: [2] },
      'nl',
    );
    expect(interactiveIds(nodes)).toEqual([
      'nl-marker-0', 'nl-marker-1', 'nl-marker-2', 'nl-marker-3',
    ]);
  });
});

describe('counting-set practice', () => {
  it('guided: only highlighted objects interactive', () => {
    const nodes = createCountingSet({ count: 5, object: 'star', arrangement: 'row', highlight: [1, 3] }, 'cs');
    expect(interactiveIds(nodes)).toEqual(['cs-object-1', 'cs-object-3']);
  });

  it('discovery: all objects interactive', () => {
    const nodes = createCountingSet({ count: 5, object: 'star', arrangement: 'row', interactive: true }, 'cs');
    expect(interactiveIds(nodes)).toEqual([
      'cs-object-0', 'cs-object-1', 'cs-object-2', 'cs-object-3', 'cs-object-4',
    ]);
  });
});

describe('fraction bar practice', () => {
  it('guided: only highlightedParts interactive', () => {
    const nodes = createFractionBar({ numerator: 3, denominator: 4, highlightedParts: [0, 2] }, 'fb');
    expect(interactiveIds(nodes)).toEqual(['fb-part-0', 'fb-part-2']);
  });

  it('discovery: all parts interactive', () => {
    const nodes = createFractionBar(
      { numerator: 3, denominator: 4, interactive: true, highlightedParts: [0, 2] },
      'fb',
    );
    expect(interactiveIds(nodes)).toEqual(['fb-part-0', 'fb-part-1', 'fb-part-2', 'fb-part-3']);
  });
});

describe('clock practice', () => {
  it('guided: highlightHand hour only', () => {
    const nodes = createClock({ hour: 3, minute: 30, highlightHand: 'hour' }, 'ck');
    expect(interactiveIds(nodes)).toEqual(['ck-hour-hand']);
  });

  it('discovery: both hands interactive', () => {
    const nodes = createClock({ hour: 3, minute: 30, interactive: true, highlightHand: 'hour' }, 'ck');
    expect(interactiveIds(nodes)).toEqual(['ck-hour-hand', 'ck-minute-hand']);
  });

  it('rejects invalid highlightHand', () => {
    expect(() => createClock({ hour: 3, minute: 0, highlightHand: 'second' as never }, 'ck')).toThrow(EngineError);
  });
});

describe('coordinate-grid practice', () => {
  const points = [
    { x: 1, y: 2, id: 'target' },
    { x: 3, y: 4, id: 'distractor-a' },
    { x: 5, y: 6, id: 'distractor-b' },
  ];

  it('guided: only highlightPoints interactive', () => {
    const nodes = createCoordinateGrid({
      x: { min: 0, max: 6, step: 1 },
      y: { min: 0, max: 6, step: 1 },
      points,
      highlightPoints: ['target'],
    }, 'cg');
    expect(interactiveIds(nodes)).toEqual(['cg-point-target']);
  });

  it('discovery: all points with id interactive', () => {
    const nodes = createCoordinateGrid({
      x: { min: 0, max: 6, step: 1 },
      y: { min: 0, max: 6, step: 1 },
      points,
      interactive: true,
      highlightPoints: ['target'],
    }, 'cg');
    expect(interactiveIds(nodes)).toEqual(['cg-point-distractor-a', 'cg-point-distractor-b', 'cg-point-target']);
  });

  it('throws when interactive but point lacks id', () => {
    expect(() => createCoordinateGrid({
      x: { min: 0, max: 6, step: 1 },
      y: { min: 0, max: 6, step: 1 },
      points: [{ x: 1, y: 2 }],
      interactive: true,
    }, 'cg')).toThrow(EngineError);
  });
});

describe('geometry practice', () => {
  it('guided: highlight whole shape', () => {
    const nodes = geometryShapeComponent.create({ shape: 'hexagon', highlight: true }, 'hex');
    expect(interactiveIds(nodes)).toEqual(['hex-shape']);
  });

  it('guided: highlight vertices', () => {
    const nodes = geometryShapeComponent.create({ shape: 'hexagon', showVertices: true, highlightVertices: true }, 'hex');
    expect(interactiveIds(nodes)).toEqual([
      'hex-shape-vertex-0', 'hex-shape-vertex-1', 'hex-shape-vertex-2',
      'hex-shape-vertex-3', 'hex-shape-vertex-4', 'hex-shape-vertex-5',
    ]);
  });

  it('guided: highlight sides', () => {
    const nodes = geometryShapeComponent.create({ shape: 'hexagon', highlightSides: true }, 'hex');
    expect(interactiveIds(nodes)).toEqual([
      'hex-shape-side-0', 'hex-shape-side-1', 'hex-shape-side-2',
      'hex-shape-side-3', 'hex-shape-side-4', 'hex-shape-side-5',
    ]);
  });

  it('discovery: only shape interactive when highlight true', () => {
    const nodes = geometryShapeComponent.create({ shape: 'hexagon', interactive: true, highlight: true }, 'hex');
    expect(interactiveIds(nodes)).toEqual(['hex-shape']);
  });

  it('rejects conflicting highlight flags', () => {
    expect(() =>
      geometryShapeComponent.create({ shape: 'triangle', highlight: true, highlightVertices: true }, 'tri')
    ).toThrow(EngineError);
  });

  it('rejects highlightVertices without showVertices', () => {
    expect(() =>
      geometryShapeComponent.create({ shape: 'triangle', highlightVertices: true }, 'tri')
    ).toThrow(EngineError);
  });
});

describe('fraction-circle practice', () => {
  it('creates denominator sectors', () => {
    const nodes = createFractionCircleSectors({ numerator: 3, denominator: 4 }, 'fc');
    const sectors = nodes.flatMap(n => n.children).filter(c => c.kind === 'wedge');
    expect(sectors).toHaveLength(4);
    expect(sectors.map(s => s.id)).toEqual(['fc-sector-0', 'fc-sector-1', 'fc-sector-2', 'fc-sector-3']);
  });

  it('guided: only highlightedParts interactive', () => {
    const nodes = createFractionCircleSectors({ numerator: 3, denominator: 4, highlightedParts: [0, 2] }, 'fc');
    expect(interactiveIds(nodes)).toEqual(['fc-sector-0', 'fc-sector-2']);
  });

  it('discovery: all sectors interactive', () => {
    const nodes = createFractionCircleSectors(
      { numerator: 3, denominator: 4, interactive: true, highlightedParts: [0, 2] },
      'fc',
    );
    expect(interactiveIds(nodes)).toEqual(['fc-sector-0', 'fc-sector-1', 'fc-sector-2', 'fc-sector-3']);
  });

  it('rejects denominator below 2', () => {
    expect(() => createFractionCircleSectors({ numerator: 1, denominator: 1 }, 'fc')).toThrow(EngineError);
  });
});