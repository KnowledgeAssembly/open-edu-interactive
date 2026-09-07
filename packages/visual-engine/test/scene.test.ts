import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';

describe('buildScene', () => {
  it('builds a number-line scene from a spec with components', () => {
    const scene = buildScene({
      kind: 'number-line',
      components: [
        { id: 'nl', type: 'number-line', props: { min: 0, max: 5, step: 1, highlight: [3] } },
      ],
    });
    expect(scene.nodes.length).toBe(1);
    const group = scene.nodes[0]!;
    expect(group.id).toBe('nl');
    expect(group.children.length).toBeGreaterThanOrEqual(8); // axis + 6 ticks + 6 labels + 1 marker
    const marker = scene.semantics['nl-marker-3'];
    expect(marker).toBeDefined();
    expect(marker!.interactive).toBe(true);
    expect(marker!.acceptsActions).toContain('select');
  });

  it('builds a scene from explicit elements', () => {
    const scene = buildScene({
      kind: 'number-line',
      elements: [
        { id: 'axis-1', type: 'line', role: 'axis' },
        { id: 'tick-0', type: 'line', role: 'tick', value: 0 },
      ],
    });
    expect(scene.semantics['axis-1']).toBeDefined();
    expect(scene.semantics['tick-0']).toBeDefined();
  });

  it('throws on duplicate id', () => {
    expect(() =>
      buildScene({
        kind: 'number-line',
        elements: [
          { id: 'dup', type: 'line' },
          { id: 'dup', type: 'circle' },
        ],
      }),
    ).toThrow('INVALID_ENTITY');
  });

  it('throws on unknown component type', () => {
    expect(() =>
      buildScene({
        kind: 'number-line',
        components: [{ id: 'x', type: 'nonexistent', props: {} }],
      }),
    ).toThrow('INVALID_ENTITY');
  });
});