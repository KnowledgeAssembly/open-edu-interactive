import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { act } from 'react';
import { mountLesson } from '../src/mount-lesson.js';

const ROOT = join(process.cwd(), '..', '..');
const LESSON = JSON.parse(
  await readFile(join(ROOT, 'docs/fixtures/composition/narrative-timeline-visual.json'), 'utf8'),
);

describe('mountLesson', () => {
  let container: HTMLElement;

  afterEach(() => {
    container.innerHTML = '';
  });

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders the lesson into the container', async () => {
    let result: Awaited<ReturnType<typeof mountLesson>>;
    await act(async () => {
      result = mountLesson(LESSON, container);
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(container.children.length).toBeGreaterThan(0);
    result!.teardown();
  });

  it('events captures lesson events after dispatch', async () => {
    let result: Awaited<ReturnType<typeof mountLesson>>;
    await act(async () => {
      result = mountLesson(LESSON, container);
      await new Promise((r) => setTimeout(r, 50));
    });
    const instances = result!.instances();
    expect(instances.length).toBeGreaterThan(0);

    const firstInstance = instances[0]!;
    await act(async () => {
      result!.dispatch(firstInstance, { type: 'reset' });
      await new Promise((r) => setTimeout(r, 50));
    });
    const evts = result!.events();
    expect(evts.length).toBeGreaterThan(0);
    result!.teardown();
  }, 10000);

  it('snapshot returns an object', () => {
    const result = mountLesson(LESSON, container);
    const instances = result.instances();
    if (instances.length > 0) {
      const snap = result.snapshot(instances[0]!);
      expect(snap).not.toBeNull();
    }
    result.teardown();
  });
});
