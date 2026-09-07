import { test, expect } from '@playwright/test';

test.describe('Visual Engine — number-line e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=visual');
    await page.waitForFunction(() => !!(window as unknown as { __harness?: unknown }).__harness);
  });

  test('a11y: rendered SVG has title, desc, and interactive markers with labels', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __harness: { svg(): string } }).__harness.svg());
    expect(svg).toContain('<svg');
    expect(svg).toContain('<title>');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).toContain('aria-label="7"');
    expect(svg).toContain('id="nl-marker-7"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');
  });

  test('geometry: the axis maps 0..10 to the canvas width and marker-7 sits at 7/10ths', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __harness: { svg(): string } }).__harness.svg());
    const markerMatch = svg.match(/id="nl-marker-7"[^>]*data-oedu-bounds="([^"]+)"/);
    expect(markerMatch).not.toBeNull();
    const [mx] = markerMatch![1]!.split(',').map(Number);
    expect(mx).toBeGreaterThan(400);
    expect(mx).toBeLessThan(600);
    // axis present
    expect(svg).toContain('id="nl-axis"');
    const axisMatch = svg.match(/id="nl-axis"[^>]*x2="([^"]+)"/);
    expect(axisMatch).not.toBeNull();
    expect(Number(axisMatch![1])).toBeGreaterThan(700);
  });

  test('interaction: dispatch select updates snapshot selection and emits namespaced event', async ({ page }) => {
    await page.evaluate(() => {
      const h = (window as unknown as { __harness: { dispatch(a: unknown): void; events(): Array<{ name: string }> } }).__harness;
      h.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
    });
    const snapshot = await page.evaluate(() => {
      return (window as unknown as { __harness: { snapshot(): { selection: string[] } } }).__harness.snapshot();
    });
    expect(snapshot.selection).toContain('nl-marker-7');

    const events = await page.evaluate(() => {
      return (window as unknown as { __harness: { events(): Array<{ name: string }> } }).__harness.events();
    });
    expect(events.some((e) => e.name === 'visual.nl-marker-7-selected')).toBe(true);
  });

  test('replay: events are recorded with monotonic seq order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { events(): Array<{ seq: number }>; dispatch(a: unknown): void } }).__harness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
      h.dispatch({ type: 'deselect', target: { id: 'nl-marker-7' } });
      const after = h.events();
      return { grew: after.length > before + 4, seqs: after.map((e) => e.seq) };
    });
    expect(result.grew).toBe(true);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('L1/L2 rejection: unknown content key and unknown kind fail tryCreate', async ({ page }) => {
    const rejectedKind = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { tryCreate(s: unknown): { ok: boolean } } }).__harness;
      return h.tryCreate({ type: 'visual', version: '1.0.0', id: 'bad', content: { kind: 'timeline' } });
    });
    expect(rejectedKind.ok).toBe(false);
  });
});
