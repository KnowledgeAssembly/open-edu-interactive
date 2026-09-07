import { describe, expect, it } from 'vitest';
import { a11yTreeOf } from '../src/accessibility/primitives.js';
import { initialState } from '../src/core/state.js';

describe('a11yTreeOf', () => {
  it('returns a labeled root node for the engine instance', () => {
    const tree = a11yTreeOf(initialState('inst-42', 'visual'));
    expect(tree.id).toBe('inst-42');
    expect(tree.role).toBe('interactive-engine');
    expect(tree.children).toEqual([]);
  });

  it('always produces a non-empty label (falls back to instance id)', () => {
    for (const instanceId of ['', 'a', 'number-line-01']) {
      const tree = a11yTreeOf(initialState(instanceId, 'chart'));
      expect(typeof tree.label).toBe('string');
      expect(tree.label?.length).toBeGreaterThan(0);
    }
  });
});