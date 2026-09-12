import { describe, it, expect } from 'vitest';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';
import { loadSkillExample } from '../src/manifest.js';

describe('runtime parity for newly extracted fixtures', () => {
  it('visual example passes VisualEngine.validate', () => {
    const example = loadSkillExample('visual') as EngineSpec;
    const engine = new VisualEngine();
    const result = engine.validate(example);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('chart example passes ChartEngine.validate', () => {
    const example = loadSkillExample('chart') as EngineSpec;
    const engine = new ChartEngine();
    const result = engine.validate(example);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});