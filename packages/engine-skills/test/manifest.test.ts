import { describe, it, expect } from 'vitest';
import { MANIFEST, getEngineEntry } from '../src/manifest.js';
import { VISUAL_KINDS } from '@knowledgeassemble/visual-engine';
import { CHART_KINDS } from '@knowledgeassemble/chart-engine';
import { DIAGRAM_KINDS } from '@knowledgeassemble/diagram-engine';

describe('manifest', () => {
  it('has six engines', () => {
    expect(MANIFEST.engines).toHaveLength(6);
  });

  it('visual kinds match VISUAL_KINDS', () => {
    const entry = getEngineEntry('visual')!;
    expect(entry.kinds.slice().sort()).toEqual([...VISUAL_KINDS].sort());
  });

  it('chart kinds match CHART_KINDS', () => {
    const entry = getEngineEntry('chart')!;
    expect(entry.kinds.slice().sort()).toEqual([...CHART_KINDS].sort());
  });

  it('diagram kinds match DIAGRAM_KINDS', () => {
    const entry = getEngineEntry('diagram')!;
    expect(entry.kinds.slice().sort()).toEqual([...DIAGRAM_KINDS].sort());
  });

  it('timeline kind is [events]', () => {
    const entry = getEngineEntry('timeline')!;
    expect(entry.kinds).toEqual(['events']);
  });

  it('geomap and composition have empty kinds', () => {
    expect(getEngineEntry('geomap')!.kinds).toEqual([]);
    expect(getEngineEntry('composition')!.kinds).toEqual([]);
  });

  it('every entry has a validationContract with package, symbol, method', () => {
    for (const e of MANIFEST.engines) {
      expect(e.validationContract.package).toMatch(/^@knowledgeassemble\//);
      expect(e.validationContract.symbol).toBeTruthy();
      expect(e.validationContract.method).toBeTruthy();
    }
  });

  it('composition validationContract resolves via engine-skills validateSpec', () => {
    const entry = getEngineEntry('composition')!;
    expect(entry.validationContract).toEqual({
      package: '@knowledgeassemble/engine-skills',
      symbol: 'validateSpec',
      method: 'composition',
    });
  });
});