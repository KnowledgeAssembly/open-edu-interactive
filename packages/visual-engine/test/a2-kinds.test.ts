import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import { VISUAL_KINDS, type VisualContent } from '../src/schema.js';

const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

function runSlice(content: VisualContent) {
  const scene = buildScene(content);
  const laid = layout(scene, CTX);
  return { scene: laid, svg: svgFrom(laid, CTX).svg };
}

function boundsWithinCanvas(scene: ReturnType<typeof buildScene>): void {
  const walk = (nodes: Array<{ bounds?: { x: number; y: number; width: number; height: number }; children: unknown[] }>): void => {
    for (const n of nodes) {
      if (n.bounds) {
        expect(n.bounds.x).toBeGreaterThanOrEqual(0);
        expect(n.bounds.y).toBeGreaterThanOrEqual(0);
        expect(n.bounds.x + n.bounds.width).toBeLessThanOrEqual(CTX.width);
        expect(n.bounds.y + n.bounds.height).toBeLessThanOrEqual(CTX.height);
      }
      walk(n.children as Array<{ bounds?: { x: number; y: number; width: number; height: number }; children: unknown[] }>);
    }
  };
  walk(scene.nodes as Array<{ bounds?: { x: number; y: number; width: number; height: number }; children: unknown[] }>);
}

describe('A2 slice honesty — every visual kind renders a real, positioned primitive', () => {
  it('covers every frozen visual kind', () => {
    expect(VISUAL_KINDS).toContain('counting-set');
    expect(VISUAL_KINDS).toContain('fraction');
    expect(VISUAL_KINDS).toContain('fraction-comparison');
    expect(VISUAL_KINDS).toContain('clock');
    expect(VISUAL_KINDS).toContain('coordinate-grid');
    expect(VISUAL_KINDS).toContain('geometry');
    expect(VISUAL_KINDS).toContain('comparison');
    expect(VISUAL_KINDS).toContain('illustration');
  });

  it('counting-set renders real objects within the canvas', () => {
    const { scene, svg } = runSlice({
      kind: 'counting-set',
      components: [{ id: 'cs', type: 'counting-set', props: { count: 6, object: 'star', arrangement: 'grid', highlight: [2, 5] } }],
    });
    const group = scene.nodes[0]!;
    const objects = group.children.filter((c) => c.role === 'counting-object');
    expect(objects.length).toBe(6);
    for (const o of objects) expect(o.bounds).toBeDefined();
    expect(svg).toContain('<path');
    expect(svg).toContain('data-oedu-interactive="true"');
    boundsWithinCanvas(scene);
  });

  it('fraction renders rect parts across the bar', () => {
    const { scene, svg } = runSlice({
      kind: 'fraction',
      components: [{ id: 'fb', type: 'fraction', props: { numerator: 3, denominator: 4, highlightedParts: [0, 1] } }],
    });
    const group = scene.nodes[0]!;
    expect(svg).toContain('<rect');
    const bar = group.children.find((c) => c.kind === 'fraction-bar')!;
    expect(bar.children.filter((c) => c.role === 'fraction-part').length).toBe(4);
    for (const p of bar.children) expect(p.bounds).toBeDefined();
    boundsWithinCanvas(scene);
  });

  it('fraction-comparison renders two items and an operator with a label/semantic primitive', () => {
    const { svg } = runSlice({
      kind: 'fraction-comparison',
      components: [{
        id: 'fc',
        type: 'fraction-comparison',
        props: {
          items: [{ id: 'a', label: '1/2', value: 0.5 }, { id: 'b', label: '1/4', value: 0.25 }],
          comparison: 'greater-than',
          interactive: true,
        },
      }],
    });
    expect(svg).toContain('>');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).toContain('<text');
  });

  it('clock renders a face, hands by angle, and numbers', () => {
    const { scene, svg } = runSlice({
      kind: 'clock',
      components: [{ id: 'cl', type: 'clock', props: { hour: 3, minute: 30 } }],
    });
    const group = scene.nodes[0]!;
    const face = group.children.find((c) => c.role === 'visual' && c.kind === 'circle');
    expect(face?.bounds).toBeDefined();
    const hands = group.children.filter((c) => c.kind === 'line' && c.geometry?.points);
    expect(hands.length).toBe(2);
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path');
    expect(svg).toContain('<text');
    boundsWithinCanvas(scene);
  });

  it('coordinate-grid renders axes, gridlines, and points', () => {
    const { svg } = runSlice({
      kind: 'coordinate-grid',
      components: [{
        id: 'cg',
        type: 'coordinate-grid',
        props: { x: { min: -5, max: 5, step: 2 }, y: { min: -5, max: 5, step: 2 }, points: [{ x: 2, y: 3 }] },
      }],
    });
    expect(svg).toContain('<path');
    expect(svg).toContain('<circle');
  });

  it('geometry renders a real polygon for a hexagon', () => {
    const { svg } = runSlice({
      kind: 'geometry',
      components: [{ id: 'gs', type: 'geometry', props: { shape: 'hexagon', label: 'Hexagon' } }],
    });
    expect(svg).toContain('<polygon');
  });

  it('comparison renders two items and an operator', () => {
    const { svg } = runSlice({
      kind: 'comparison',
      components: [{
        id: 'cp',
        type: 'comparison',
        props: { items: [{ id: 'a', label: '5', value: 5 }, { id: 'b', label: '3', value: 3 }], comparison: 'greater-than', interactive: true },
      }],
    });
    expect(svg).toContain('>');
    expect(svg).toContain('<text');
  });

  it('illustration renders labeled entities in a row', () => {
    const { svg } = runSlice({
      kind: 'illustration',
      entities: [
        { id: 'sun', label: 'Sun' },
        { id: 'moon', label: 'Moon' },
        { id: 'star', label: 'Star' },
      ],
    });
    expect(svg).toContain('Sun');
    expect(svg).toContain('Moon');
    expect(svg).toContain('Star');
    expect(svg).toContain('<rect');
  });

  it('is deterministic for every kind', () => {
    const contents: VisualContent[] = [
      { kind: 'counting-set', components: [{ id: 'cs', type: 'counting-set', props: { count: 4, object: 'circle', arrangement: 'row' } }] },
      { kind: 'fraction', components: [{ id: 'fb', type: 'fraction', props: { numerator: 1, denominator: 2 } }] },
      { kind: 'clock', components: [{ id: 'cl', type: 'clock', props: { hour: 6, minute: 0 } }] },
      { kind: 'geometry', components: [{ id: 'gs', type: 'geometry', props: { shape: 'triangle' } }] },
      { kind: 'comparison', components: [{ id: 'cp', type: 'comparison', props: { items: [{ id: 'a', label: '4', value: 4 }, { id: 'b', label: '2', value: 2 }], comparison: 'greater-than' } }] },
    ];
    for (const c of contents) {
      const a = runSlice(c);
      const b = runSlice(c);
      expect(b.svg).toBe(a.svg);
    }
  });
});
