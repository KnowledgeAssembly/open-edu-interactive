import { test, expect } from '@playwright/test';

test.describe('Lesson host — composed timeline → visual e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=lesson');
    await page.waitForFunction(() => !!(window as unknown as { __lessonHarness?: unknown }).__lessonHarness);
  });

  test('cross-engine binding: timeline select routes focus to visual entity', async ({ page }) => {
    const btn = page.locator('[data-event-id="event-1947"]');
    await expect(btn).toBeVisible();
    await btn.click();

    const snapshot = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { snapshot(id: string): object } }).__lessonHarness;
      return h.snapshot('visual-independence') as { focus: string | null };
    });
    expect(snapshot.focus).toBe('figure-independence');

    const events = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { events(): Array<{ name: string }> } }).__lessonHarness;
      return h.events().map((e) => e.name);
    });
    expect(events).toContain('timeline.event-selected');
    expect(events).toContain('visual.figure-independence-focused');
  });

  test('replay: events have monotonic seq order', async ({ page }) => {
    await page.locator('[data-event-id="event-1947"]').click();

    const seqs = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { events(): Array<{ seq: number }> } }).__lessonHarness;
      return h.events().map((e) => e.seq);
    });
    expect(seqs.length).toBeGreaterThan(4);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]!).toBeGreaterThan(seqs[i - 1]!);
    }
  });

  test('a11y: visual SVG has aria-labels and interactive markers', async ({ page }) => {
    const svg = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { svg(id: string): string } }).__lessonHarness;
      return h.svg('visual-independence');
    });
    expect(svg).toContain('aria-label');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  test('authoring proof: tryCreate validates an AI-authored timeline spec', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { tryCreate(s: unknown): { ok: boolean } } }).__lessonHarness;
      return h.tryCreate({
        type: 'interactive',
        id: 'test',
        engines: [{ instanceId: 'tl', engine: 'timeline', spec: { type: 'timeline', version: '1.0.0', id: 'tl-test', content: { kind: 'events', events: [{ id: 'e1', label: 'E1', date: '1900' }] }, sources: [{ class: 'authoritative' }] } }],
        bindings: [],
      });
    });
    expect(result.ok).toBe(true);
  });
});