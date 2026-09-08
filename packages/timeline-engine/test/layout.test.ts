import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import type { LayoutContext } from '../src/layout/engine.js';
import type { TimelineContent } from '../src/schema.js';

const CTX: LayoutContext = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

describe('layout', () => {
  it('assigns bounds to interactive and visual nodes', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
    };
    const scene = layout(buildScene(content), CTX);
    const withBounds = scene.nodes.filter((n) => n.bounds);
    expect(withBounds.length).toBeGreaterThan(0);
    // Event markers should always have bounds
    const markers = scene.nodes.filter((n) => n.kind === 'event-marker');
    for (const m of markers) {
      expect(m.bounds).toBeDefined();
    }
  });

  it('is deterministic (two runs byte-equal bounds)', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1950' },
      ],
    };
    const a = layout(buildScene(content), CTX);
    const b = layout(buildScene(content), CTX);
    expect(JSON.stringify(a.nodes.map((n) => n.bounds))).toBe(JSON.stringify(b.nodes.map((n) => n.bounds)));
  });

  it('markers on distinct tracks land on distinct lanes', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
      tracks: [
        { id: 't1', label: 'T1', events: ['e1'] },
        { id: 't2', label: 'T2', events: ['e2'] },
      ],
    };
    const scene = layout(buildScene(content), CTX);
    const e1 = scene.nodes.find((n) => n.id === 'e1');
    const e2 = scene.nodes.find((n) => n.id === 'e2');
    expect(e1?.bounds?.y).not.toBe(e2?.bounds?.y);
  });

  it('period band spans its fromDay-toDay', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
      periods: [{ id: 'p1', label: 'Period', from: '1850', to: '1950' }],
    };
    const scene = layout(buildScene(content), CTX);
    const band = scene.nodes.find((n) => n.kind === 'period-band');
    expect(band?.bounds).toBeDefined();
    expect(band?.bounds!.width).toBeGreaterThan(0);
  });

  it('labels axis ticks with real years on a day-number domain', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1757' },
        { id: 'e2', label: 'B', date: '1947-08-15' },
      ],
    };
    const scene = layout(buildScene(content), CTX);
    const labels = scene.nodes.filter((n) => n.kind === 'text' && n.id.startsWith('label-tick-'));
    expect(labels.length).toBeGreaterThanOrEqual(4);
    for (const node of labels) {
      expect(node.label).toMatch(/^-?\d+$/);
      const year = Number(node.label);
      expect(year, `label "${node.label}" must be a 4-digit year, not a day number`).toBeGreaterThanOrEqual(1700);
      expect(year, `label "${node.label}" must be a 4-digit year, not a day number`).toBeLessThanOrEqual(2000);
      expect(node.value).toBe(year);
    }
  });
});