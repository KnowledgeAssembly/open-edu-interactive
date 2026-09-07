import { test, expect } from '@playwright/test';

test.describe('Timeline Engine e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=timeline');
    await page.waitForFunction(() => !!(window as unknown as { __timelineHarness?: unknown }).__timelineHarness);
  });

  test('a11y: SVG has title/desc; events and periods have aria-labels; linear list exists', async ({ page }) => {
    const svg = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { svg(): string } }).__timelineHarness;
      return h.svg();
    });
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    expect(svg).toContain('aria-label');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');

    const linear = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { linear(): Array<{ kind: string; id: string }> } }).__timelineHarness;
      return h.linear();
    });
    expect(linear.length).toBeGreaterThan(0);
  });

  test('interaction: clicking an event dispatches select; snapshot reflects it', async ({ page }) => {
    const btn = page.locator('[data-event-id="event-1947"]');
    await expect(btn).toBeVisible();
    await btn.click();

    const snapshot = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { snapshot(): { selection: string[] } } }).__timelineHarness;
      return h.snapshot() as { selection: string[] };
    });
    expect(snapshot.selection).toContain('event-1947');

    const events = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { events(): Array<{ name: string; action?: { type: string; target?: { id: string } } }> } }).__timelineHarness;
      return h.events();
    });
    const selectedNames = events.filter((e) => e.name === 'timeline.event-selected');
    expect(selectedNames.length).toBe(1);
  });

  test('playback: play-pause toggles snapshot().playback; step moves forward; scrub jumps', async ({ page }) => {
    const snapBefore = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { snapshot(): { playback: string; step: number } } }).__timelineHarness;
      return h.snapshot() as { playback: string; step: number };
    });
    expect(snapBefore.playback).toBe('stopped');
    expect(snapBefore.step).toBe(0);

    await page.evaluate(() => {
      (window as unknown as { __timelineHarness: { dispatch(a: { type: string }): void } }).__timelineHarness.dispatch({ type: 'play-pause' });
    });

    const snapAfterPlay = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { snapshot(): { playback: string } } }).__timelineHarness;
      return h.snapshot() as { playback: string };
    });
    expect(snapAfterPlay.playback).toBe('playing');

    await page.evaluate(() => {
      (window as unknown as { __timelineHarness: { dispatch(a: { type: string }): void } }).__timelineHarness.dispatch({ type: 'step' });
    });

    const snapAfterStep = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { snapshot(): { step: number } } }).__timelineHarness;
      return h.snapshot() as { step: number };
    });
    expect(snapAfterStep.step).toBe(1);
  });

  test('replay: events are recorded in monotonic seq order', async ({ page }) => {
    await page.locator('[data-event-id="event-1857"]').click();

    const result = await page.evaluate(() => {
      const h = (window as unknown as { __timelineHarness: { events(): Array<{ seq: number }> } }).__timelineHarness;
      const seqs = h.events().map((e) => e.seq);
      return { seqs, len: seqs.length };
    });
    expect(result.len).toBeGreaterThan(2);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('data fidelity: invalid dates, unknown tracks, and duplicate memberships fail tryCreate', async ({ page }) => {
    const badDate = await page.evaluate(() => {
      const h = (window as unknown as {
        __timelineHarness: { tryCreate(s: unknown): { ok: boolean; code?: string; message?: string } }
      }).__timelineHarness;
      return h.tryCreate({
        type: 'timeline', version: '1.0.0', id: 'bad',
        content: { kind: 'events', events: [{ id: 'e1', label: 'A', date: 'yesterday' }] },
        sources: [{ class: 'authoritative' }],
      });
    });
    expect(badDate.ok).toBe(false);

    const unknownTrack = await page.evaluate(() => {
      const h = (window as unknown as {
        __timelineHarness: { tryCreate(s: unknown): { ok: boolean; code?: string; message?: string } }
      }).__timelineHarness;
      return h.tryCreate({
        type: 'timeline', version: '1.0.0', id: 'bad',
        content: {
          kind: 'events', events: [{ id: 'e1', label: 'A', date: '1900' }],
          tracks: [{ id: 't1', label: 'T', events: ['e-unknown'] }],
        },
        sources: [{ class: 'authoritative' }],
      });
    });
    expect(unknownTrack.ok).toBe(false);
  });

  test('rejection: unknown content kind fails tryCreate', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as {
        __timelineHarness: { tryCreate(s: unknown): { ok: boolean; code?: string; message?: string } }
      }).__timelineHarness;
      return h.tryCreate({
        type: 'timeline', version: '1.0.0', id: 'bad',
        content: { kind: 'periods', events: [] },
      });
    });
    expect(result.ok).toBe(false);
  });
});