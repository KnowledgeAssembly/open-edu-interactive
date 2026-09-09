import { describe, it, expect } from 'vitest';
import { loadSpec } from '../src/load-spec.js';
import { catalog } from '../generated/catalog.generated.js';

describe('loadSpec', () => {
  it('loads engine fixtures by catalog specPath', () => {
    const entry = catalog.find((e) => e.id === 'visual/number-line');
    expect(entry).toBeDefined();
    const spec = loadSpec(entry!.specPath) as { type?: string };
    expect(spec.type).toBe('visual');
  });

  it('loads docs composition fixtures', () => {
    const entry = catalog.find((e) => e.id === 'lesson/narrative-timeline-visual');
    expect(entry).toBeDefined();
    expect(loadSpec(entry!.specPath)).toBeTruthy();
  });

  it('loads chart bar fixture used by conformance', () => {
    const spec = loadSpec('packages/chart-engine/fixture/bar/input.chart.json') as { id?: string };
    expect(spec.id).toBe('rainfall-monthly');
  });
});
