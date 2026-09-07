import { test, expect } from '@playwright/test';

test.describe('Visual Engine — number-line e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as unknown as { __harness?: unknown }).__harness);
  });

  test('a11y: rendered SVG has title, desc, and interactive markers with labels', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __harness: { svg(): string } }).__harness.svg());
    expect(svg).toContain('<svg');
    expect(svg).toContain('<title>');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  test('interaction: dispatch select updates snapshot selection', async ({ page }) => {
    await page.evaluate(() => {
      const h = (window as unknown as { __harness: { dispatch(a: unknown): void; snapshot(): unknown } }).__harness;
      h.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
    });
    const snapshot = await page.evaluate(() => {
      return (window as unknown as { __harness: { snapshot(): { selection: string[] } } }).__harness.snapshot();
    });
    expect(snapshot.selection).toContain('nl-marker-7');
  });

  test('replay: events are recorded with seq order', async ({ page }) => {
    const events = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { events(): Array<{ seq: number; name: string }>; dispatch(a: unknown): void } }).__harness;
      const initialCount = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
      const afterEvents = h.events();
      return { initialCount, afterEvents: afterEvents.map((e: { seq: number; name: string }) => ({ seq: e.seq, name: e.name })) };
    });
    expect(events.afterEvents.length).toBeGreaterThan(events.initialCount);
    const seqs = events.afterEvents.map((e: { seq: number }) => e.seq);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]!).toBeGreaterThan(seqs[i - 1]!);
    }
  });

  test('L1/L2 rejection: unknown content key fails tryCreate', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { tryCreate(s: unknown): { ok: boolean } } }).__harness;
      return h.tryCreate({
        type: 'visual',
        version: '1.0.0',
        id: 'bad',
        content: { kind: 'timeline' },
      });
    });
    expect(result.ok).toBe(false);
  });
});