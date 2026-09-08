import { describe, expect, it } from 'vitest';
import { EngineError, initialState, type EngineState } from '@knowledgeassemble/interactive-engine';
import { timelineReducer } from '../src/reducer.js';

describe('timelineReducer', () => {
  it('step on an empty sequence throws INVALID_STATE (defensive; schema requires ≥1 event)', () => {
    const state: EngineState = { ...initialState('t', 'timeline'), phase: 'running' };
    expect(() => timelineReducer(state, { type: 'step' }, [])).toThrow(EngineError);
    try {
      timelineReducer(state, { type: 'step' }, []);
    } catch (error) {
      expect((error as { code?: string }).code).toBe('INVALID_STATE');
    }
  });

  it('reset returns step 0 with playback stopped', () => {
    const state: EngineState = { ...initialState('t', 'timeline'), phase: 'running', step: 3, playback: 'playing' };
    const reduced = timelineReducer(state, { type: 'reset' }, ['e1', 'e2', 'e3', 'e4']);
    expect(reduced.step).toBe(0);
    expect(reduced.playback).toBe('stopped');
  });
});