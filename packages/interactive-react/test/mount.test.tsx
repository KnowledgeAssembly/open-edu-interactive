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
});
