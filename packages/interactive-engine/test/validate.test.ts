import { describe, expect, it } from 'vitest';
import { runPipeline, type ValidationHooks } from '../src/validation/pipeline.js';
import { validateEnvelope } from '../src/validation/validate.js';
import type { EngineSpec } from '../src/schemas/envelope.js';

const VALID: EngineSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-01',
  metadata: { title: 'Locate half' },
  purpose: { learningObjective: 'Locate 1/2 on the number line' },
  interaction: { actions: ['select', 'focus', 'reset'] },
  content: { min: 0, max: 1, highlight: 0.5 },
};

describe('validateEnvelope', () => {
  it('accepts a valid envelope', () => {
    expect(validateEnvelope(VALID)).toEqual({ valid: true, issues: [] });
  });

  it('rejects a missing id with INVALID_REFERENCE', () => {
    const result = validateEnvelope({ ...VALID, id: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_REFERENCE');
  });

  it('rejects a malformed version with INVALID_VERSION', () => {
    const result = validateEnvelope({ ...VALID, version: '1.0' });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_VERSION');
  });

  it('rejects purpose.skill with INVALID_SPEC and a path', () => {
    const result = validateEnvelope({
      ...VALID,
      purpose: { ...VALID.purpose, skill: 'x' },
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
    expect(result.issues[0]!.path).toBe('purpose');
  });

  it('rejects an unknown top-level key with INVALID_SPEC', () => {
    const result = validateEnvelope({ ...VALID, extra: true });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
  });

  it('rejects an invalid entity id (bad charset) as INVALID_REFERENCE', () => {
    const result = validateEnvelope({ ...VALID, id: '1bad-id' });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_REFERENCE');
  });
});

describe('runPipeline', () => {
  it('passes a valid envelope with no hooks (P1 default)', () => {
    expect(runPipeline(VALID)).toEqual({ valid: true, issues: [] });
  });

  it('short-circuits on L1 failure and ignores hooks', () => {
    let hooksCalled = false;
    const hooks: ValidationHooks = {
      semantic: () => {
        hooksCalled = true;
        return { valid: false, issues: [] };
      },
    };
    const result = runPipeline({ ...VALID, nope: 1 }, hooks);
    expect(result.valid).toBe(false);
    expect(hooksCalled).toBe(false);
    expect(result.issues[0]!.level).toBe('L1');
  });

  it('accumulates L2 failure after valid L1', () => {
    const result = runPipeline(VALID, {
      semantic: () => ({
        valid: false,
        issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'bad entity' }],
      }),
    });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.level).toBe('L2');
  });

  it('runs all layers to completion when all pass', () => {
    const result = runPipeline(VALID, {
      semantic: () => ({ valid: true, issues: [] }),
      layout: () => ({ valid: true, issues: [] }),
      accessibility: () => ({ valid: true, issues: [] }),
    });
    expect(result.valid).toBe(true);
  });
});
