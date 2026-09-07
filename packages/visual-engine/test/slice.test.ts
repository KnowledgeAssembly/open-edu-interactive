import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import type { VisualContent } from '../src/schema.js';

const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

function runSlice(content: VisualContent) {
  const scene = buildScene(content);
  const laid = layout(scene, CTX);
  return { scene: laid, svg: svgFrom(laid, CTX) };
}

describe('end-to-end visual slice (spec -> scene -> layout -> svg)', () => {
  it('maps 0..10 values left-to-right across the canvas width', () => {
    const { scene, svg } = runSlice({
      kind: 'number-line',
      components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
    });
    const group = scene.nodes[0]!;
    const tick = (v: number) => group.children.find((c) => c.id === `nl-tick-${v}`)!;
    const x0 = tick(0).bounds!.x;
    const x5 = tick(5).bounds!.x;
    const x10 = tick(10).bounds!.x;
    expect(x0).toBeLessThan(x5);
    expect(x5).toBeLessThan(x10);
    expect(x0).toBeGreaterThanOrEqual(19);
    expect(x10).toBeLessThanOrEqual(780);

    const marker = group.children.find((c) => c.id === 'nl-marker-7')!;
    expect(marker.bounds!.x).toBeGreaterThan(400);
    expect(marker.bounds!.x).toBeLessThan(600);
    expect(marker.bounds!.width).toBeGreaterThanOrEqual(44);
    expect(svg.svg).toContain('id="nl-marker-7"');
    expect(svg.svg).toContain('cx="552"');
  });

  it('is deterministic across two runs', () => {
    const a = runSlice({ kind: 'number-line', components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 5, step: 1 } }] });
    const b = runSlice({ kind: 'number-line', components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 5, step: 1 } }] });
    expect(b.svg.svg).toBe(a.svg.svg);
  });

  it('positions the interactive marker as the largest touch target', () => {
    const { scene } = runSlice({
      kind: 'number-line',
      components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
    });
    const marker = scene.nodes[0]!.children.find((c) => c.id === 'nl-marker-7')!;
    const label = scene.nodes[0]!.children.find((c) => c.id === 'nl-label-7')!;
    expect(marker.bounds!.width).toBeGreaterThan(label.bounds!.width);
  });
});
