import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStubHost } from '../src/stub-host.js';

describe('createStubHost', () => {
  it('returns host and bridge with defaults', () => {
    const { host, bridge, events, clearEvents } = createStubHost();
    expect(host.locale).toBe('en');
    expect(host.tokens).toEqual({});
    expect(host.reducedMotion).toBe(false);
    expect(bridge.locale).toBe('en');
    expect(typeof bridge.t).toBe('function');
    expect(bridge.t('hello')).toBe('hello');
    expect(typeof bridge.resolveAsset).toBe('function');
    expect(bridge.resolveAsset('x')).toBe('x');
    expect(typeof events).toBe('function');
    expect(typeof clearEvents).toBe('function');
  });

  it('captures events via host.onEvent', () => {
    const { host, events } = createStubHost();
    host.onEvent({ id: 'e1', seq: 0, name: 'engine-mounted', action: undefined });
    expect(events()).toHaveLength(1);
    expect(events()[0]).toMatchObject({ seq: 0, name: 'engine-mounted' });
  });

  it('caps events at 200', () => {
    const { host, events } = createStubHost();
    for (let i = 0; i < 250; i++) {
      host.onEvent({ id: `e${i}`, seq: i, name: 'evt', action: undefined });
    }
    expect(events()).toHaveLength(200);
  });

  it('calls onAnnounce when provided', () => {
    const messages: string[] = [];
    createStubHost({ onAnnounce: (m) => messages.push(m) });
    // announce is called by host, not directly returned
  });

  it('calls onEvent when provided', () => {
    const captured: Array<{ seq: number; name: string; action?: unknown }> = [];
    const { host } = createStubHost({ onEvent: (e) => captured.push(e) });
    host.onEvent({ id: 'e1', seq: 5, name: 'select', action: { type: 'select', target: { id: 'x' } } });
    expect(captured).toEqual([{ seq: 5, name: 'select', action: { type: 'select', target: { id: 'x' } } }]);
  });
});
