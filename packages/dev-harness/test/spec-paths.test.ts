import { describe, it, expect } from 'vitest';
import { catalogPathFromGlobKey } from '../src/spec-paths.js';

describe('catalogPathFromGlobKey', () => {
  it('maps vite-normalized engine glob keys to catalog paths', () => {
    expect(catalogPathFromGlobKey('../../chart-engine/fixture/bar/input.chart.json')).toBe(
      'packages/chart-engine/fixture/bar/input.chart.json',
    );
  });

  it('maps docs glob keys to catalog paths', () => {
    expect(catalogPathFromGlobKey('../../../docs/fixtures/composition/narrative-timeline-visual.json')).toBe(
      'docs/fixtures/composition/narrative-timeline-visual.json',
    );
  });
});
