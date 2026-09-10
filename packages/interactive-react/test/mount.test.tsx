import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRef, createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { InteractiveLesson } from '../src/InteractiveLesson.js';
import type { InteractiveLessonHandle } from '../src/InteractiveLesson.js';
import { InteractiveNode } from '../src/InteractiveNode.js';
import type { InteractiveNodeHandle } from '../src/InteractiveNode.js';
import type { OpenEduBridge } from '../src/bridge.js';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const COMPOSED_LESSON = JSON.parse(
  readFileSync(resolve(THIS_DIR, '../../../docs/fixtures/p7/composed-lesson.json'), 'utf8'),
) as never;
const ENGINE_REPS = JSON.parse(
  readFileSync(resolve(THIS_DIR, '../../../docs/fixtures/p7/engine-reps.json'), 'utf8'),
) as { visual: unknown };

function makeBridge(onEvent?: (e: { seq: number; name: string }) => void): OpenEduBridge {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    t: (key: string) => key,
    announce: () => {},
    onEvent: onEvent ?? (() => {}),
    resolveAsset: (id: string) => id,
  };
}

describe('InteractiveLesson mount (jsdom)', () => {
  it('mounts and exposes instance snapshot/dispatch through the handle', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<InteractiveLessonHandle>();
    const root = createRoot(container);
    act(() => {
      root.render(createElement(InteractiveLesson, { lesson: COMPOSED_LESSON, host: makeBridge(), ref }));
    });

    act(() => {
      ref.current?.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } });
    });

    const snapshot = ref.current?.snapshot('visual-independence') as { focus: string | null } | undefined;
    expect(snapshot?.focus).toBe('figure-independence');

    const events = ref.current?.events() ?? [];
    expect(events.map((e) => e.name)).toContain('visual.figure-independence-focused');

    const svgContent = container.querySelector('[data-instance-id="timeline-independence"] [data-oedu-svg-content]');
    expect(svgContent?.innerHTML.length).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('learner mode: SVG click on timeline instance dispatches select', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<InteractiveLessonHandle>();
    const emitted: string[] = [];
    const root = createRoot(container);
    act(() => {
      root.render(createElement(InteractiveLesson, { lesson: COMPOSED_LESSON, host: makeBridge((e) => emitted.push(e.name)), ref }));
    });

    const eventEl = container.querySelector('#event-1947')!;
    expect(eventEl).toBeTruthy();

    act(() => {
      eventEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const snap = ref.current?.snapshot('timeline-independence') as { selection?: string[] } | undefined;
    expect(snap?.selection).toContain('event-1947');
    expect(emitted).toContain('timeline.event-selected');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('imperative dispatch refreshes selection visuals', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<InteractiveNodeHandle>();
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(InteractiveNode, {
          spec: ENGINE_REPS.visual,
          engineType: 'visual',
          host: makeBridge(),
          ref,
        }),
      );
    });

    act(() => {
      ref.current?.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
    });

    const marker = container.querySelector('#nl-marker-7');
    expect(marker?.getAttribute('data-oedu-selected')).toBe('true');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('InteractiveNode mount (jsdom)', () => {
  it('mounts a single engine and records its events on the handle', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<InteractiveNodeHandle>();
    const emitted: string[] = [];
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(InteractiveNode, {
          spec: ENGINE_REPS.visual,
          engineType: 'visual',
          host: makeBridge((e) => emitted.push(e.name)),
          ref,
        }),
      );
    });

    act(() => {
      ref.current?.dispatch({ type: 'focus', target: { id: 'nl' } });
    });

    const nodeEvents = ref.current?.events() ?? [];
    expect(nodeEvents.some((e) => e.name === 'engine-mounted')).toBe(true);
    expect(nodeEvents.some((e) => e.name === 'visual.nl-focused')).toBe(true);
    expect(emitted.some((n) => n === 'visual.nl-focused')).toBe(true);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('learner mode: clicking SVG interactive target dispatches select', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref = createRef<InteractiveNodeHandle>();
    const emitted: string[] = [];
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(InteractiveNode, {
          spec: ENGINE_REPS.visual,
          engineType: 'visual',
          host: makeBridge((e) => emitted.push(e.name)),
          ref,
        }),
      );
    });

    const marker = container.querySelector('#nl-marker-7')!;
    expect(marker).toBeTruthy();

    act(() => {
      marker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const snap = ref.current?.snapshot() as { selection?: string[] } | undefined;
    expect(snap?.selection).toContain('nl-marker-7');
    expect(emitted.some((n) => n === 'visual.nl-marker-7-selected')).toBe(true);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('learner mode: no dev control buttons by default', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(InteractiveNode, {
          spec: ENGINE_REPS.visual,
          engineType: 'visual',
          host: makeBridge(),
          ref: createRef<InteractiveNodeHandle>(),
        }),
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('dev mode: renders control map buttons', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(InteractiveNode, {
          spec: ENGINE_REPS.visual,
          engineType: 'visual',
          host: makeBridge(),
          ref: createRef<InteractiveNodeHandle>(),
          controlsMode: 'dev',
        }),
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    const hasSelectAction = Array.from(buttons).some((b) => b.textContent?.includes('(select)'));
    expect(hasSelectAction).toBe(true);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});