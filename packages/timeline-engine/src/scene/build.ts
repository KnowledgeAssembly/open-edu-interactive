import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { TimelineContent, TimelineEvent, TimelineTrack } from '../schema.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string, what: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', `timeline: duplicate ${what} id "${id}"`);
  }
  seen.add(id);
}

function dayNumber(dateString: string): number {
  const neg = dateString.startsWith('-');
  const parts = (neg ? dateString.slice(1) : dateString).split('-').map(Number);
  let year = parts[0] ?? 0;
  if (neg) year = -year;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return prolepticGregorianDayNumber(year, month, day);
}

function prolepticGregorianDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const m = month <= 2 ? month + 12 : month;
  const era = y >= 0 ? y : y - 3999;
  const e = Math.floor(era / 400);
  const f = era - e * 400;
  const jd = Math.floor(365.25 * f) - Math.floor(f / 100) + Math.floor(f / 4) + day + (153 * m + 2) / 5 + 1721119 + e * 146097;
  return jd;
}

export function buildScene(content: TimelineContent): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const eventById = new Map<string, TimelineEvent>();
  const trackById = new Map<string, TimelineTrack>();
  const eventTrack = new Map<string, string>();

  for (const event of content.events) {
    assertUnique(seen, event.id, 'event');
    eventById.set(event.id, event);
  }

  if (content.periods) {
    for (const period of content.periods) {
      assertUnique(seen, period.id, 'period');
    }
  }

  if (content.tracks) {
    for (const track of content.tracks) {
      assertUnique(seen, track.id, 'track');
      trackById.set(track.id, track);
      for (const eventId of track.events) {
        if (!eventById.has(eventId)) {
          throw new EngineError('INVALID_REFERENCE', `timeline: track "${track.id}" references unknown event "${eventId}"`);
        }
        if (eventTrack.has(eventId)) {
          throw new EngineError('INVALID_ENTITY', `timeline: event "${eventId}" belongs to multiple tracks ("${eventTrack.get(eventId)}" and "${track.id}")`);
        }
        eventTrack.set(eventId, track.id);
      }
    }
  }

  const trackIds = content.tracks ? new Set(content.tracks.map((t) => t.id)) : new Set<string>();
  for (const event of content.events) {
    if (event.trackId && !trackIds.has(event.trackId)) {
      throw new EngineError('INVALID_REFERENCE', `timeline: event "${event.id}" references unknown track "${event.trackId}"`);
    }
    if (event.trackId && content.tracks) {
      const track = content.tracks.find((t) => t.id === event.trackId);
      if (track && !track.events.includes(event.id)) {
        eventTrack.set(event.id, event.trackId);
      }
    }
  }

  const defaultTrackId = 'track-default';

  for (const event of content.events) {
    const dn = dayNumber(event.date);
    const trackId = eventTrack.get(event.id) ?? event.trackId ?? defaultTrackId;
    const marker: SceneNode = {
      id: event.id,
      role: 'selectable',
      kind: 'event-marker',
      label: `${event.label} (${event.date})`,
      interactive: true,
      acceptsActions: ['select', 'focus'],
      metadata: {
        date: dn,
        dateString: event.date,
        label: event.label,
        trackId,
        links: event.links,
      },
      children: [],
    };
    semantics[event.id] = marker;
    nodes.push(marker);
  }

  const periodIds = new Set<string>();
  if (content.periods) {
    for (const period of content.periods) {
      const fromDay = dayNumber(period.from);
      const toDay = dayNumber(period.to);
      const pid = `period-${period.id}`;
      assertUnique(seen, pid, 'period-node');
      periodIds.add(pid);
      const band: SceneNode = {
        id: pid,
        role: 'period-band',
        kind: 'period-band',
        label: `${period.label} (${period.from} – ${period.to})`,
        interactive: false,
        metadata: {
          fromDay,
          toDay,
          from: period.from,
          to: period.to,
          label: period.label,
          description: period.description,
          role: period.style?.role ?? 'secondary-period',
        },
        children: [],
      };
      semantics[pid] = band;
      nodes.push(band);
    }
  }

  const trackLanes = new Map<string, SceneNode>();
  if (content.tracks) {
    for (const track of content.tracks) {
      const tid = `track-${track.id}`;
      const lane: SceneNode = {
        id: tid,
        role: 'track-lane',
        kind: 'track-lane',
        label: track.label,
        metadata: { eventIds: track.events, label: track.label },
        children: [],
      };
      semantics[tid] = lane;
      trackLanes.set(track.id, lane);
      nodes.push(lane);
    }
  }

  const defaultLane: SceneNode = {
    id: `track-${defaultTrackId}`,
    role: 'track-lane',
    kind: 'track-lane',
    label: '',
    metadata: { eventIds: content.events.filter((e) => (eventTrack.get(e.id) ?? e.trackId ?? defaultTrackId) === defaultTrackId).map((e) => e.id), label: '' },
    children: [],
  };
  semantics[defaultLane.id] = defaultLane;
  nodes.push(defaultLane);

  const axis: SceneNode = {
    id: 'axis-time',
    role: 'axis',
    kind: 'axis',
    label: 'Time',
    children: [],
  };
  semantics[axis.id] = axis;
  nodes.push(axis);

  return { nodes, semantics };
}