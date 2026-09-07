import { describe, expect, it } from 'vitest';
import { EngineError } from '@knowledgeassemble/interactive-engine';
import { buildScene } from '../src/scene/build.js';
import type { TimelineContent } from '../src/schema.js';

describe('buildScene', () => {
  const eventsOnly: TimelineContent = {
    kind: 'events',
    events: [
      { id: 'e1', label: 'Event One', date: '1900' },
      { id: 'e2', label: 'Event Two', date: '1950' },
    ],
  };

  it('produces event-marker nodes for each event', () => {
    const scene = buildScene(eventsOnly);
    const markers = scene.nodes.filter((n) => n.kind === 'event-marker');
    expect(markers).toHaveLength(2);
    expect(markers[0]?.id).toBe('e1');
    expect(markers[1]?.id).toBe('e2');
  });

  it('markers are interactive with select/focus actions', () => {
    const scene = buildScene(eventsOnly);
    const marker = scene.nodes.find((n) => n.id === 'e1');
    expect(marker?.interactive).toBe(true);
    expect(marker?.acceptsActions).toEqual(['select', 'focus']);
    expect(marker?.role).toBe('selectable');
  });

  it('markers carry parsed day numbers in metadata', () => {
    const scene = buildScene(eventsOnly);
    const marker = scene.nodes.find((n) => n.id === 'e1');
    expect(marker?.metadata?.date).toBeTypeOf('number');
    expect(marker?.metadata?.dateString).toBe('1900');
  });

  it('produces period-band nodes for periods', () => {
    const withPeriods: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
      periods: [{ id: 'p1', label: 'A Period', from: '1850', to: '1950' }],
    };
    const scene = buildScene(withPeriods);
    const band = scene.nodes.find((n) => n.kind === 'period-band');
    expect(band).toBeDefined();
    expect(band?.metadata?.fromDay).toBeTypeOf('number');
    expect(band?.metadata?.toDay).toBeTypeOf('number');
  });

  it('period-band nodes are not selectable', () => {
    const withPeriods: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
      periods: [{ id: 'p1', label: 'A Period', from: '1850', to: '1950' }],
    };
    const scene = buildScene(withPeriods);
    const band = scene.nodes.find((n) => n.kind === 'period-band');
    expect(band?.interactive).toBe(false);
  });

  it('produces track-lane nodes for tracks plus default lane', () => {
    const withTracks: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
      tracks: [{ id: 't1', label: 'Track 1', events: ['e1'] }],
    };
    const scene = buildScene(withTracks);
    const lanes = scene.nodes.filter((n) => n.kind === 'track-lane');
    expect(lanes.length).toBeGreaterThanOrEqual(2);
    const namedLane = lanes.find((n) => n.id === 'track-t1');
    expect(namedLane).toBeDefined();
    const defaultLane = lanes.find((n) => n.id === 'track-track-default');
    expect(defaultLane).toBeDefined();
  });

  it('duplicate track membership throws INVALID_ENTITY', () => {
    const dup: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
      tracks: [
        { id: 't1', label: 'Tracks 1', events: ['e1', 'e2'] },
        { id: 't2', label: 'Tracks 2', events: ['e1'] },
      ],
    };
    expect(() => buildScene(dup)).toThrow(EngineError);
    try { buildScene(dup); } catch (e) {
      expect((e as EngineError).code).toBe('INVALID_ENTITY');
    }
  });

  it('unknown track event ref throws INVALID_REFERENCE', () => {
    const bad: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
      tracks: [{ id: 't1', label: 'T', events: ['e-unknown'] }],
    };
    expect(() => buildScene(bad)).toThrow(EngineError);
    try { buildScene(bad); } catch (e) {
      expect((e as EngineError).code).toBe('INVALID_REFERENCE');
    }
  });
});