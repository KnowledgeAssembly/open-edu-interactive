import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/runtime/event-log.js';

describe('EventLog', () => {
  it('appends events with monotonic seq and instance-scoped ids', () => {
    const log = new EventLog();
    const first = log.append('state-changed', 'inst-1');
    const second = log.append('state-changed', 'inst-1');
    expect(first.seq).toBe(0);
    expect(second.seq).toBe(1);
    expect(first.id).toBe('inst-1:0');
    expect(second.id).toBe('inst-1:1');
  });

  it('attaches action and data when provided', () => {
    const log = new EventLog();
    const event = log.append('state-changed', 'inst-1', { note: 'x' }, {
      type: 'select',
      target: { id: 'a' },
    });
    expect(event.data).toEqual({ note: 'x' });
    expect(event.action).toEqual({ type: 'select', target: { id: 'a' } });
  });

  it('replay returns events in insertion order as an immutable copy', () => {
    const log = new EventLog();
    log.append('engine-mounted', 'inst-1');
    log.append('engine-ready', 'inst-1');
    log.append('state-changed', 'inst-1');
    const replay = log.replay();
    expect(replay.map((e) => e.name)).toEqual(['engine-mounted', 'engine-ready', 'state-changed']);
    expect(replay).not.toBe(log.list());
    replay[0]!.name = 'mutated';
    expect(log.list()[0]!.name).toBe('engine-mounted');
  });
});
