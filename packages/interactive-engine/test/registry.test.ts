import { beforeEach, describe, expect, it } from 'vitest';
import type { Engine, EngineType } from '../src/core/engine.js';
import { EngineError } from '../src/core/errors.js';
import { EngineRegistry } from '../src/core/registry.js';

function stubEngine(type: EngineType): Engine {
  return {
    type,
    validate: () => ({ valid: true, issues: [] }),
    instantiate: () => {
      throw new EngineError('UNSUPPORTED_ACTION', 'registry tests never instantiate');
    },
  };
}

describe('EngineRegistry', () => {
  let registry: EngineRegistry;

  beforeEach(() => {
    registry = new EngineRegistry();
  });

  it('registers an engine and retrieves it by type', () => {
    const engine = stubEngine('visual');
    registry.register(engine);
    expect(registry.get('visual')).toBe(engine);
  });

  it('lists registered engine types in registration order', () => {
    registry.register(stubEngine('visual'));
    registry.register(stubEngine('chart'));
    expect(registry.list()).toEqual(['visual', 'chart']);
  });

  it('returns undefined for an unregistered engine type', () => {
    expect(registry.get('geomap')).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });

  it('throws EngineError when an engine type is already registered', () => {
    registry.register(stubEngine('timeline'));
    expect(() => registry.register(stubEngine('timeline'))).toThrowError(EngineError);
    expect(() => registry.register(stubEngine('timeline'))).toThrowError(
      /already registered/,
    );
  });

  it('throws INVALID_STATE on duplicate registration', () => {
    registry.register(stubEngine('diagram'));
    let caught: unknown;
    try {
      registry.register(stubEngine('diagram'));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect((caught as EngineError).code).toBe('INVALID_STATE');
  });
});
