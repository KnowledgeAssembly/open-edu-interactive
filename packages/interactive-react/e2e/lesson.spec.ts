import { test, expect } from '@playwright/test';

test.describe('Lesson host — composed timeline → visual e2e (real InteractiveLesson mount)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=lesson');
    await page.waitForFunction(() => !!(window as unknown as { __lessonHarness?: unknown }).__lessonHarness);
    await expect(page.locator('[data-interactive-lesson]')).toBeVisible();
  });

  test('cross-engine binding: timeline select routes focus to visual entity', async ({ page }) => {
    await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { dispatch(id: string, a: unknown): void } }).__lessonHarness;
      h.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } });
    });

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

  test('replay: events have monotonic seq order matching the golden log', async ({ page }) => {
    await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { dispatch(id: string, a: unknown): void } }).__lessonHarness;
      h.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } });
    });

    const seqs = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { events(): Array<{ seq: number }> } }).__lessonHarness;
      return h.events().map((e) => e.seq);
    });
    expect(seqs.length).toBe(12);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]!).toBeGreaterThan(seqs[i - 1]!);
    }
  });

  test('a11y: visual SVG has aria-labels and interactive markers, no inline script', async ({ page }) => {
    const svg = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { svg(id: string): string } }).__lessonHarness;
      return h.svg('visual-independence');
    });
    expect(svg).toContain('aria-label');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  test('authoring proof: tryCreate validates a lesson and surfaces issue codes', async ({ page }) => {
    const ok = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { tryCreate(s: unknown): { ok: boolean } } }).__lessonHarness;
      return h.tryCreate({
        id: 'test',
        engines: [{ instanceId: 'tl', engine: 'timeline', spec: { type: 'timeline', version: '1.0.0', id: 'tl-test', content: { kind: 'events', events: [{ id: 'e1', label: 'E1', date: '1900' }] }, sources: [{ class: 'authoritative' }] } }],
        bindings: [],
      });
    });
    expect(ok.ok).toBe(true);

    const rejected = await page.evaluate(() => {
      const h = (window as unknown as { __lessonHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__lessonHarness;
      return h.tryCreate({ id: 'bad', engines: [{ instanceId: 'v', engine: 'visual', spec: { not: 'an envelope' } }], bindings: [] });
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe('INVALID_SPEC');
  });
});
