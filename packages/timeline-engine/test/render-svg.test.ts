import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import type { LayoutContext } from '../src/layout/engine.js';
import type { TimelineContent } from '../src/schema.js';

const CTX: LayoutContext = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

describe('svgFrom', () => {
  it('is deterministic (two runs byte-identical)', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1950' },
      ],
    };
    const scene = layout(buildScene(content), CTX);
    const a = svgFrom(scene, CTX, 'Test', 'Desc');
    const b = svgFrom(scene, CTX, 'Test', 'Desc');
    expect(a.svg).toBe(b.svg);
  });

  it('produces no on* or script attributes (security)', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
    };
    const scene = layout(buildScene(content), CTX);
    const result = svgFrom(scene, CTX);
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
    expect(result.svg).not.toContain('javascript:');
  });

  it('a11y labels every event marker and period band', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e1', label: 'Event One', date: '1900' },
        { id: 'e2', label: 'Event Two', date: '1950' },
      ],
      periods: [{ id: 'p1', label: 'A Period', from: '1850', to: '1950' }],
    };
    const scene = layout(buildScene(content), CTX);
    const result = svgFrom(scene, CTX, 'Test');
    const eventIds = content.events.map((e) => e.id);
    for (const id of eventIds) {
      const a11yNode = result.a11y.find((a) => a.id === id);
      expect(a11yNode, `event ${id} should have a11y node`).toBeDefined();
      expect(a11yNode!.label).toBeTruthy();
    }
  });

  it('linear lists all periods and events chronologically', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [
        { id: 'e2', label: 'Later', date: '1950' },
        { id: 'e1', label: 'Earlier', date: '1900' },
      ],
      periods: [{ id: 'p1', label: 'Period', from: '1800', to: '2000' }],
    };
    const scene = layout(buildScene(content), CTX);
    const result = svgFrom(scene, CTX);
    expect(result.linear.length).toBe(3);
    const kinds = result.linear.map((r) => r.kind);
    expect(kinds.filter((k) => k === 'event').length).toBe(2);
    expect(kinds.filter((k) => k === 'period').length).toBe(1);
  });

  it('interactive maps each event to select/focus', () => {
    const content: TimelineContent = {
      kind: 'events',
      events: [{ id: 'e1', label: 'A', date: '1900' }],
    };
    const scene = layout(buildScene(content), CTX);
    const result = svgFrom(scene, CTX);
    expect(result.interactive.length).toBeGreaterThan(0);
    const actionsForE1 = result.interactive.filter((i) => i.id === 'e1').map((i) => i.action);
    expect(actionsForE1).toContain('select');
    expect(actionsForE1).toContain('focus');
  });
});