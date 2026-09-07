import { describe, expect, it } from 'vitest';
import { EngineError } from '../src/core/errors.js';
import { initialState } from '../src/core/state.js';
import { baseReducer } from '../src/runtime/reducer.js';
import type { EngineAction } from '../src/core/action.js';

const base = () => initialState('inst-1', 'visual');

describe('baseReducer', () => {
  it('handles select/deselect with dedupe and order preservation', () => {
    let state = base();
    state = baseReducer(state, { type: 'select', target: { id: 'a' } });
    state = baseReducer(state, { type: 'select', target: { id: 'b' } });
    state = baseReducer(state, { type: 'select', target: { id: 'a' } });
    expect(state.selection).toEqual(['a', 'b']);
    state = baseReducer(state, { type: 'deselect', target: { id: 'a' } });
    expect(state.selection).toEqual(['b']);
  });

  it('handles focus/unfocus', () => {
    let state = base();
    state = baseReducer(state, { type: 'focus', target: { id: 'x' } });
    expect(state.focus).toBe('x');
    state = baseReducer(state, { type: 'unfocus' });
    expect(state.focus).toBeNull();
  });

  it('handles filter/clear-filter', () => {
    let state = base();
    state = baseReducer(state, { type: 'filter', payload: { ids: ['a', 'b'] } });
    expect(state.filter).toEqual(['a', 'b']);
    state = baseReducer(state, { type: 'clear-filter' });
    expect(state.filter).toEqual([]);
  });

  it('handles open/close-annotation', () => {
    let state = base();
    state = baseReducer(state, { type: 'open-annotation', target: { id: 'n' } });
    expect(state.annotations['n']).toBe('open');
    state = baseReducer(state, { type: 'close-annotation', target: { id: 'n' } });
    expect(state.annotations['n']).toBe('closed');
  });

  it('handles toggle/expand/collapse', () => {
    let state = base();
    state = baseReducer(state, { type: 'toggle', target: { id: 'g' } });
    expect(state.expanded).toEqual(['g']);
    state = baseReducer(state, { type: 'toggle', target: { id: 'g' } });
    expect(state.expanded).toEqual([]);
    state = baseReducer(state, { type: 'expand', target: { id: 'g' } });
    state = baseReducer(state, { type: 'expand', target: { id: 'g' } });
    expect(state.expanded).toEqual(['g']);
    state = baseReducer(state, { type: 'collapse', target: { id: 'g' } });
    expect(state.expanded).toEqual([]);
  });

  it('handles play-pause (stopped -> playing)', () => {
    let state = base();
    state = baseReducer(state, { type: 'play-pause' });
    expect(state.playback).toBe('playing');
    state = baseReducer(state, { type: 'play-pause' });
    expect(state.playback).toBe('paused');
  });

  it('handles step only while paused', () => {
    let state = base();
    state = baseReducer(state, { type: 'step' });
    expect(state.step).toBe(0);
    state = baseReducer(state, { type: 'play-pause' });
    state = baseReducer(state, { type: 'play-pause' });
    state = baseReducer(state, { type: 'step' });
    expect(state.step).toBe(1);
  });

  it('handles reset back to initial state', () => {
    let state = base();
    state = baseReducer(state, { type: 'select', target: { id: 'a' } });
    state = baseReducer(state, { type: 'focus', target: { id: 'f' } });
    state = baseReducer(state, { type: 'play-pause' });
    state = baseReducer(state, { type: 'reset' });
    expect(state.selection).toEqual([]);
    expect(state.focus).toBeNull();
    expect(state.playback).toBe('stopped');
    expect(state.phase).toBe('running');
    expect(state.instanceId).toBe('inst-1');
    expect(state.engine).toBe('visual');
  });

  it('accepts engine-specific actions and records lastAction without base state change', () => {
    const actions = [
      'zoom',
      'pan',
      'scrub',
      'jump-to',
      'drag',
      'drop',
      'place',
      'move',
      'connect',
      'disconnect',
      'follow',
      'answer',
      'compare',
    ] as const;
    for (const type of actions) {
      const state = baseReducer(base(), { type } as never);
      expect(state.lastAction?.type).toBe(type);
    }
  });

  it('throws UNSUPPORTED_ACTION for unknown action types', () => {
    expect(() => baseReducer(base(), { type: 'not-an-action' } as never)).toThrowError(EngineError);
    try {
      baseReducer(base(), { type: 'not-an-action' } as never);
    } catch (error) {
      expect((error as EngineError).code).toBe('UNSUPPORTED_ACTION');
    }
  });

  it('is pure — does not mutate the input state', () => {
    const state = base();
    const before = JSON.stringify(state);
    baseReducer(state, { type: 'select', target: { id: 'a' } });
    baseReducer(state, { type: 'focus', target: { id: 'f' } });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('is deterministic — same sequence yields identical snapshots', () => {
    const actions: EngineAction[] = [
      { type: 'select', target: { id: 'a' } },
      { type: 'select', target: { id: 'b' } },
      { type: 'focus', target: { id: 'b' } },
      { type: 'toggle', target: { id: 'g' } },
      { type: 'step' },
      { type: 'play-pause' },
    ];
    const s1 = actions.reduce(baseReducer, base());
    const s2 = actions.reduce(baseReducer, base());
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2));
  });
});
