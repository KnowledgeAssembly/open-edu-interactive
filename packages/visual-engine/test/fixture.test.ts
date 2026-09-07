import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import type { VisualContent } from '../src/schema.js';

const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

const input = JSON.parse(
  readFileSync(new URL('../fixture/number-line/input.visual.json', import.meta.url), 'utf8'),
) as { content: VisualContent };

function render(): { svg: string; scene: unknown } {
  const scene = layout(buildScene(input.content), CTX);
  return { svg: svgFrom(scene, CTX).svg, scene };
}

describe('golden fixtures — number-line', () => {
  it('expected.svg is byte-stable against the current renderer', () => {
    const expected = readFileSync(new URL('../fixture/number-line/expected.svg', import.meta.url), 'utf8');
    expect(render().svg).toBe(expected);
  });

  it('expected.scene.json is byte-stable against the current scene builder', () => {
    const expected = readFileSync(new URL('../fixture/number-line/expected.scene.json', import.meta.url), 'utf8');
    expect(JSON.stringify(render().scene, null, 2)).toBe(expected);
  });
});
