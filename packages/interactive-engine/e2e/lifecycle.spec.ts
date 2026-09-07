import { expect, test, type Page } from '@playwright/test';
import { openHarness } from './harness.js';

interface Snapshot {
  phase: string;
  selection: string[];
  focus: string | null;
}

async function snapshot(page: Page): Promise<Snapshot> {
  return (await page.evaluate(() => window.__harness!.snapshot())) as Snapshot;
}

test('lifecycle: mounts, dispatches semantic actions, and resets state', async ({ page }) => {
  await openHarness(page);

  const initial = await snapshot(page);
  expect(initial.phase).toBe('running');
  expect(initial.selection).toEqual([]);
  expect(initial.focus).toBeNull();

  await page.evaluate(() => window.__harness!.dispatch({ type: 'select', target: { id: 'a' } }));
  await page.evaluate(() => window.__harness!.dispatch({ type: 'select', target: { id: 'b' } }));
  let snap = await snapshot(page);
  expect(snap.selection).toEqual(['a', 'b']);

  await page.evaluate(() => window.__harness!.dispatch({ type: 'focus', target: { id: 'a' } }));
  snap = await snapshot(page);
  expect(snap.focus).toBe('a');

  await page.evaluate(() => window.__harness!.dispatch({ type: 'reset' }));
  snap = await snapshot(page);
  expect(snap.selection).toEqual([]);
  expect(snap.focus).toBeNull();
  expect(snap.phase).toBe('running');
});