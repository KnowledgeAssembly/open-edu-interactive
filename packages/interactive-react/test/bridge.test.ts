import { describe, it, expect, vi } from 'vitest';
import { bridgeToHost } from '../src/bridge.js';
import type { OpenEduBridge } from '../src/bridge.js';
import type { EngineEvent } from '@knowledgeassemble/interactive-engine';

function createMockBridge(overrides?: Partial<OpenEduBridge>): OpenEduBridge {
  return {
    locale: 'en-US',
    tokens: {},
    reducedMotion: false,
    t: (key: string) => key,
    announce: vi.fn(),
    onEvent: vi.fn(),
    resolveAsset: (id: string) => id,
    ...overrides,
  };
}

describe('bridgeToHost', () => {
  it('maps locale correctly', () => {
    const bridge = createMockBridge({ locale: 'fr-FR' });
    const host = bridgeToHost(bridge);
    expect(host.locale).toBe('fr-FR');
  });

  it('maps tokens correctly', () => {
    const bridge = createMockBridge({ tokens: { greeting: 'Bonjour' } });
    const host = bridgeToHost(bridge);
    expect(host.tokens).toEqual({ greeting: 'Bonjour' });
  });

  it('maps reducedMotion correctly', () => {
    const bridge = createMockBridge({ reducedMotion: true });
    const host = bridgeToHost(bridge);
    expect(host.reducedMotion).toBe(true);
  });

  it('calls announce on host.announce', () => {
    const announce = vi.fn();
    const bridge = createMockBridge({ announce });
    const host = bridgeToHost(bridge);
    host.announce('test message');
    expect(announce).toHaveBeenCalledWith('test message');
  });

  it('calls announce when reducedMotion is true and announce is invoked', () => {
    const announce = vi.fn();
    const bridge = createMockBridge({ reducedMotion: true, announce });
    const host = bridgeToHost(bridge);
    host.announce('focus update');
    expect(announce).toHaveBeenCalledWith('focus update');
  });

  it('forwards onEvent events unchanged', () => {
    const onEvent = vi.fn();
    const bridge = createMockBridge({ onEvent });
    const host = bridgeToHost(bridge);

    const event: EngineEvent = {
      id: 'evt-1',
      seq: 1,
      name: 'engine-mounted',
      instanceId: 'inst-1',
    };
    host.onEvent(event);
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('passes resolveAsset through', () => {
    const resolveAsset = vi.fn(() => new Uint8Array([1, 2, 3]));
    const bridge = createMockBridge({ resolveAsset });
    const host = bridgeToHost(bridge);

    const result = host.resolveAsset('asset-1');
    expect(resolveAsset).toHaveBeenCalledWith('asset-1');
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('forwards multiple events in sequence', () => {
    const onEvent = vi.fn();
    const bridge = createMockBridge({ onEvent });
    const host = bridgeToHost(bridge);

    const events: EngineEvent[] = [
      { id: 'e1', seq: 1, name: 'engine-mounted', instanceId: 'i1' },
      { id: 'e2', seq: 2, name: 'engine-ready', instanceId: 'i1' },
      { id: 'e3', seq: 3, name: 'state-changed', instanceId: 'i1', action: { type: 'select', target: { id: 't1' } } },
    ];

    for (const event of events) {
      host.onEvent(event);
    }

    expect(onEvent).toHaveBeenCalledTimes(3);
    for (let i = 0; i < events.length; i++) {
      expect(onEvent).toHaveBeenNthCalledWith(i + 1, events[i]);
    }
  });
});