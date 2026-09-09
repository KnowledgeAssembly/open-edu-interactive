import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { act } from 'react';
import { mountLesson } from '../src/mount-lesson.js';

const ROOT = join(process.cwd(), '..', '..');
const LESSON = JSON.parse(
  await readFile(join(ROOT, 'docs/fixtures/composition/narrative-timeline-visual.json'), 'utf8'),
);

async function waitForLessonReady(result: ReturnType<typeof mountLesson>): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (result.instances().length > 0) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  throw new Error('mountLesson: lesson did not become ready');
}

describe('mountLesson', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the lesson into the container', async () => {
    let result!: ReturnType<typeof mountLesson>;
    await act(async () => {
      result = mountLesson(LESSON, container);
    });
    await waitForLessonReady(result);
    expect(container.querySelector('[data-interactive-lesson]')).not.toBeNull();
    await act(async () => {
      result.teardown();
    });
  });

  it('events captures lesson events after mount and dispatch', async () => {
    let result!: ReturnType<typeof mountLesson>;
    await act(async () => {
      result = mountLesson(LESSON, container);
    });
    await waitForLessonReady(result);

    const instances = result.instances();
    expect(instances.length).toBeGreaterThan(0);
    expect(result.events().length).toBeGreaterThan(0);

    const firstInstance = instances[0]!;
    await act(async () => {
      result.dispatch(firstInstance, { type: 'reset' });
    });

    expect(result.events().length).toBeGreaterThan(0);
    await act(async () => {
      result.teardown();
    });
  });

  it('snapshot returns an object', async () => {
    let result!: ReturnType<typeof mountLesson>;
    await act(async () => {
      result = mountLesson(LESSON, container);
    });
    await waitForLessonReady(result);

    const instances = result.instances();
    expect(instances.length).toBeGreaterThan(0);
    const snap = result.snapshot(instances[0]!);
    expect(snap).not.toBeNull();

    await act(async () => {
      result.teardown();
    });
  });
});
