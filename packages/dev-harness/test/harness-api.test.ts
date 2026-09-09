import { describe, it, expect, vi } from 'vitest';
import { exposeHarness } from '../src/harness-api.js';
import type { EngineMountResult, LessonMountResult } from '../src/types.js';

describe('exposeHarness', () => {
  it('engine mount: single-arg dispatch', () => {
    const dispatch = vi.fn();
    const mount: EngineMountResult = {
      instanceId: 'visual-1',
      dispatch,
      snapshot: () => ({ ok: true }),
      events: () => [],
      validate: () => ({ valid: true, issues: [] }),
      teardown: () => {},
      renderTargets: [],
    };

    const win = {} as Window;
    exposeHarness(win, mount);
    const harness = (win as { __harness?: { dispatch(action: { type: string }): void } }).__harness!;

    harness.dispatch({ type: 'reset' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'reset' });
  });

  it('lesson mount: two-arg dispatch', () => {
    const dispatch = vi.fn();
    const mount: LessonMountResult = {
      dispatch,
      snapshot: () => ({}),
      events: () => [],
      instances: () => ['timeline-independence'],
      teardown: () => {},
    };

    const win = {} as Window;
    exposeHarness(win, mount);
    const harness = (win as {
      __harness?: { dispatch(instanceId: string, action: { type: string }): void };
    }).__harness!;

    harness.dispatch('timeline-independence', { type: 'reset' });
    expect(dispatch).toHaveBeenCalledWith('timeline-independence', { type: 'reset' });
  });

  it('lesson mount: snapshot uses first instance', () => {
    const mount: LessonMountResult = {
      dispatch: () => {},
      snapshot: (instanceId: string) => ({ instanceId, focus: 'figure-a' }),
      events: () => [],
      instances: () => ['timeline-independence', 'visual-independence'],
      teardown: () => {},
    };

    const win = {} as Window;
    exposeHarness(win, mount);
    const harness = (win as { __harness?: { snapshot(): unknown } }).__harness!;

    expect(harness.snapshot()).toEqual({ instanceId: 'timeline-independence', focus: 'figure-a' });
  });

  it('merges extras onto harness', () => {
    const mount: EngineMountResult = {
      instanceId: 'x',
      dispatch: () => {},
      snapshot: () => ({}),
      events: () => [],
      validate: () => ({ valid: true, issues: [] }),
      teardown: () => {},
      renderTargets: [],
    };

    const win = {} as Window;
    exposeHarness(win, mount, { svg: () => '<svg></svg>' });
    const harness = (win as { __harness?: { svg(): string } }).__harness!;

    expect(harness.svg()).toBe('<svg></svg>');
  });
});
