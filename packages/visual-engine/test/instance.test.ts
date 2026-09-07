import { describe, expect, it } from 'vitest';
import { EngineRegistry, EngineError } from '@knowledgeassemble/interactive-engine';
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '../src/engine.js';

function stubHost(): EngineHost {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (_id: string) => '',
  };
}

const NL_SPEC = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-test',
  content: {
    kind: 'number-line',
    components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
  },
  accessibility: { label: 'Number line test', description: 'Test number line' },
};

describe('VisualEngine', () => {
  it('registers in EngineRegistry', () => {
    const registry = new EngineRegistry();
    const engine = new VisualEngine();
    registry.register(engine);
    expect(registry.get('visual')).toBe(engine);
  });

  it('validates a correct number-line spec', () => {
    const engine = new VisualEngine();
    const result = engine.validate(NL_SPEC as never);
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown content.kind', () => {
    const engine = new VisualEngine();
    const badSpec = { ...NL_SPEC, content: { kind: 'timeline' } };
    const result = engine.validate(badSpec as never);
    expect(result.valid).toBe(false);
  });

  it('instantiate creates a running instance', () => {
    const engine = new VisualEngine();
    const instance = engine.instantiate(NL_SPEC as never, stubHost());
    expect(instance.id).toBe('number-line-test');
    expect(instance.engine).toBe('visual');
    expect(instance.snapshot().phase).toBe('running');
  });

  it('dispatch select updates selection and emits namespaced events', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const instance = engine.instantiate(NL_SPEC as never, host);
    instance.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
    expect(instance.snapshot().selection).toContain('nl-marker-7');
    const nsEvent = events.find((e) => e.name.startsWith('visual.'));
    expect(nsEvent).toBeDefined();
  });
});