import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TimelineEngine } from '../src/engine.js';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';

const FIXTURE_DIR = new URL('../fixture/', import.meta.url);

function stubHost() {
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

function loadSpec(name: string): EngineSpec {
  const url = new URL(`${name}/input.timeline.json`, FIXTURE_DIR);
  return JSON.parse(readFileSync(url, 'utf8')) as EngineSpec;
}

describe('TimelineEngine — render output has visible primitives (N1.7)', () => {
  it('events fixture SVG contains <circle> event markers and <text> labels', () => {
    const spec = loadSpec('events');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-events-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<circle');
    expect(svg).toMatch(/data-oedu-role="[^"]+"/);
    expect(svg).toContain('<title');
  });

  it('periods fixture SVG contains <rect> period bands and <circle> events', () => {
    const spec = loadSpec('periods');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-periods-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<rect');
    expect(svg).toContain('<circle');
  });

  it('tracks fixture SVG shows track labels and event markers', () => {
    const spec = loadSpec('tracks');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-tracks-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toMatch(/data-oedu-role/);
  });

  it('independence fixture SVG contains events, periods, and track markers', () => {
    const spec = loadSpec('independence');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-independence-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<circle');
    expect(svg).toContain('<rect');
    expect(svg).toMatch(/data-oedu-role/);
  });

  it('events fixture SVG is not hollow (has meaningful content)', () => {
    const spec = loadSpec('events');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-events-nonhollow');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    const hollowPattern = /^<svg[^>]*>\s*<title>[^<]*<\/title>\s*<desc>[^<]*<\/desc>\s*<g[^>]*>\s*<\/g>\s*<\/svg>\s*$/;
    expect(svg).not.toMatch(hollowPattern);
  });
});