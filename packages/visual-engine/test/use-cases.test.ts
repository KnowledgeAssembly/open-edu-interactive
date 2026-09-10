import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VisualEngine } from '../src/engine.js';
import type { EngineHost } from '@knowledgeassemble/interactive-engine';

const engine = new VisualEngine();
const host: EngineHost = { locale: 'en' as const, tokens: {}, reducedMotion: false, announce: () => {}, onEvent: () => {}, resolveAsset: (id: string) => id };

describe('use case nl-identify-marked', () => {
  it('acceptance: no marker circle per integer in SVG', () => {
    const spec = JSON.parse(readFileSync(new URL('../fixture/number-line-identify-marked/input.visual.json', import.meta.url), 'utf-8'));
    const inst = engine.instantiate(spec, host, 'uc-nl-identify');
    const snap = inst.snapshot() as unknown as { svgResult: { svg: string } };
    const svg = snap.svgResult.svg;
    const markerCircles = (svg.match(/data-oedu-role="marker"/g) ?? []).length;
    expect(markerCircles).toBe(0);
    const interactiveLabels = (svg.match(/data-oedu-role="number"[^>]*data-oedu-interactive="true"/g) ?? []).length;
    expect(interactiveLabels).toBeGreaterThan(1);
  });
});

describe('use case nl-locate-guided (regression)', () => {
  it('baseline number-line fixture still validates', () => {
    const spec = JSON.parse(readFileSync(new URL('../fixture/number-line/input.visual.json', import.meta.url), 'utf-8'));
    expect(engine.validate(spec).valid).toBe(true);
  });
});

describe('use case cg-plot-point', () => {
  it('only highlightPoints are interactive', () => {
    const spec = JSON.parse(readFileSync(new URL('../fixture/coordinate-grid-practice/input.visual.json', import.meta.url), 'utf-8'));
    const inst = engine.instantiate(spec, host, 'uc-cg-plot');
    const snap = inst.snapshot() as unknown as { svgResult: { interactive: Array<{ id: string }> } };
    const ids = [...new Set(snap.svgResult.interactive.map((i) => i.id))].sort();
    expect(ids).toEqual(['cg-point-target']);
  });
});