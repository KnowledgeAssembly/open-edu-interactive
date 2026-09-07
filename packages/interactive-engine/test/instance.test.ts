import { describe, expect, it } from 'vitest';
import type { EngineHost } from '../src/core/host.js';
import { EngineError } from '../src/core/errors.js';
import type { EngineEvent } from '../src/core/event.js';
import type { EngineSpec } from '../src/schemas/envelope.js';
import { createPlatformInstance } from '../src/runtime/instance.js';

const SPEC: EngineSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-01',
  metadata: { title: 'Number Line' },
  purpose: { learningObjective: 'Identify values on a number line' },
  interaction: { actions: ['select', 'focus', 'reset'] },
  content: {},
};

function stubHost(overrides: Partial<EngineHost> = {}): EngineHost {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
    ...overrides,
  };
}

describe('createPlatformInstance', () => {
  it('creates a valid instance with initial running state', () => {
    const instance = createPlatformInstance(SPEC, stubHost());
    expect(instance.id).toBe('number-line-01');
    expect(instance.engine).toBe('visual');
    expect(instance.snapshot().phase).toBe('running');
    expect(instance.snapshot().selection).toEqual([]);
  });

  it('rejects an invalid spec with INVALID_SPEC', () => {
    try {
      createPlatformInstance({ ...SPEC, unknownKey: true } as never, stubHost());
      expect.unreachable('invalid spec should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).code).toBe('INVALID_SPEC');
    }
  });

  it('dispatches actions and mutates state only via events', () => {
    const instance = createPlatformInstance(SPEC, stubHost());
    instance.dispatch({ type: 'select', target: { id: 'a' } });
    instance.dispatch({ type: 'focus', target: { id: 'a' } });
    expect(instance.snapshot().selection).toEqual(['a']);
    expect(instance.snapshot().focus).toBe('a');
  });

  it('rejects an unknown action with UNSUPPORTED_ACTION', () => {
    const instance = createPlatformInstance(SPEC, stubHost());
    try {
      instance.dispatch({ type: 'not-an-action' } as never);
      expect.unreachable('unknown action should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).code).toBe('UNSUPPORTED_ACTION');
    }
  });

  it('emits lifecycle and state-changed events through host.onEvent and subscribe', () => {
    const events: EngineEvent[] = [];
    const instance = createPlatformInstance(SPEC, stubHost({ onEvent: (e) => events.push(e) }));
    const subscribed: EngineEvent[] = [];
    instance.subscribe((e) => subscribed.push(e));

    instance.dispatch({ type: 'select', target: { id: 'a' } });

    const names = events.map((e) => e.name);
    expect(names).toEqual(['engine-mounted', 'engine-ready', 'interaction-started', 'state-changed']);
    expect(subscribed.map((e) => e.name)).toEqual(['interaction-started', 'state-changed']);
    expect(events[3]!.action).toEqual({ type: 'select', target: { id: 'a' } });
  });

  it('announces selection/focus changes only when reducedMotion is enabled', () => {
    const announcements: string[] = [];
    const instance = createPlatformInstance(SPEC, stubHost({ reducedMotion: true, announce: (m) => announcements.push(m) }));
    instance.dispatch({ type: 'select', target: { id: 'a' } });
    instance.dispatch({ type: 'focus', target: { id: 'a' } });
    expect(announcements).toContain('a');
    expect(announcements).toContain('Focused a');
  });

  it('does not announce when reducedMotion is disabled', () => {
    const announcements: string[] = [];
    const instance = createPlatformInstance(SPEC, stubHost({ announce: (m) => announcements.push(m) }));
    instance.dispatch({ type: 'select', target: { id: 'a' } });
    expect(announcements).toEqual([]);
  });
});
