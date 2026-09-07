import { expect, test } from '@playwright/test';
import { openHarness } from './harness.js';

test('L1 rejection: a spec with an unknown key is rejected and no instance is created', async ({
  page,
}) => {
  await openHarness(page);

  const rejected = (await page.evaluate(() =>
    window.__harness!.tryCreate({
      type: 'visual',
      version: '1.0.0',
      id: 'bad-01',
      unknownKey: true,
    }),
  )) as { ok: boolean; code?: string };

  expect(rejected.ok).toBe(false);
  expect(rejected.code).toBe('INVALID_SPEC');

  const accepted = (await page.evaluate(() =>
    window.__harness!.tryCreate({ type: 'visual', version: '1.0.0', id: 'ok-01' }),
  )) as { ok: boolean };

  expect(accepted.ok).toBe(true);
});