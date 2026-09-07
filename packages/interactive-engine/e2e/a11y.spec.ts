import { expect, test } from '@playwright/test';
import { openHarness } from './harness.js';

test('a11y: rendered scene exposes role and a non-empty aria-label', async ({ page }) => {
  await openHarness(page);

  const node = page.locator('[role="interactive-engine"]');
  await expect(node).toBeVisible();
  await expect(node).toHaveAttribute('id', 'number-line-conformance');

  const label = await node.getAttribute('aria-label');
  expect(label).toBeTruthy();
});