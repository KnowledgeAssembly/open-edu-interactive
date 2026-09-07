import { test, expect } from '@playwright/test';

test.describe('Composition — timeline → visual e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=composition');
    await page.waitForFunction(() => !!(window as unknown as { __compositionHarness?: unknown }).__compositionHarness);
  });

  test('interaction: clicking timeline event routes focus to visual entity', async ({ page }) => {
    const btn = page.locator('[data-event-id="event-1947"]');
    await expect(btn).toBeVisible();
    await btn.click();

    const snapshot = await page.evaluate(() => {
      const h = (window as unknown as { __compositionHarness: { snapshot(id: string): object } }).__compositionHarness;
      return h.snapshot('visual-independence') as { focus: string | null };
    });
    expect(snapshot.focus).toBe('figure-independence');

    const events = await page.evaluate(() => {
      const h = (window as unknown as { __compositionHarness: { events(): Array<{ name: string }> } }).__compositionHarness;
      return h.events().map((e) => e.name);
    });
    const tIdx = events.indexOf('timeline.event-selected');
    const vIdx = events.indexOf('visual.figure-independence-focused');
    expect(tIdx).toBeGreaterThan(0);
    expect(vIdx).toBeGreaterThan(tIdx);
  });

  test('replay: events are recorded with monotonic seq order', async ({ page }) => {
    await page.locator('[data-event-id="event-1947"]').click();

    const result = await page.evaluate(() => {
      const h = (window as unknown as { __compositionHarness: { events(): Array<{ seq: number }> } }).__compositionHarness;
      const seqs = h.events().map((e) => e.seq);
      return { seqs, len: seqs.length };
    });
    expect(result.len).toBeGreaterThan(4);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('a11y: focused visual entity has a non-empty aria-label and role', async ({ page }) => {
    await page.locator('[data-event-id="event-1947"]').click();

    const svg = await page.evaluate(() => {
      const h = (window as unknown as { __compositionHarness: { svg(id: string): string } }).__compositionHarness;
      return h.svg('visual-independence');
    });
    expect(svg).toContain('aria-label="Independence celebration"');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  test('rejection: tryCreate of a malformed lesson fails with a shared code', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __compositionHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__compositionHarness;
      return h.tryCreate({ id: 'bad', engines: [{ instanceId: 'x', engine: 'timeline', spec: { type: 'visual' } }], bindings: [] });
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBeDefined();
  });
});