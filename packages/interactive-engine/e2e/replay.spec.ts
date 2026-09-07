import { expect, test } from '@playwright/test';
import { openHarness, type HarnessEvent } from './harness.js';

test('replay: emitted events are ordered by seq and replay preserves original order', async ({
  page,
}) => {
  await openHarness(page);

  await page.evaluate(() => window.__harness!.dispatch({ type: 'select', target: { id: 'a' } }));
  await page.evaluate(() => window.__harness!.dispatch({ type: 'deselect', target: { id: 'a' } }));

  const events = (await page.evaluate(() => window.__harness!.events())) as HarnessEvent[];

  expect(events.map((e) => `${e.seq}:${e.name}`)).toEqual([
    '0:engine-mounted',
    '1:engine-ready',
    '2:interaction-started',
    '3:state-changed',
    '4:interaction-started',
    '5:state-changed',
  ]);

  const seqs = events.map((e) => e.seq);
  expect(seqs).toEqual([...seqs].sort((a, b) => a - b));

  const replay = JSON.parse(JSON.stringify(events)) as HarnessEvent[];
  expect(replay).toEqual(events);
  expect(replay[2]!.action).toEqual({ type: 'select', target: { id: 'a' } });
});