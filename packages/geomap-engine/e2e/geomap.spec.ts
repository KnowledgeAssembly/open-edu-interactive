import { test, expect } from '@playwright/test';

test.describe('GeoMap Engine — odisha-coastal e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=geomap');
    await page.waitForFunction(() => !!(window as unknown as { __geomapHarness?: unknown }).__geomapHarness);
  });

  test('a11y: SVG has title and desc; every interactive entity has aria-label; an alternative list exists', async ({ page }) => {
    const svg = await page.evaluate(() => {
      return (window as unknown as { __geomapHarness: { svg(): string } }).__geomapHarness.svg();
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    expect(svg).toContain('aria-label');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');

    const alternative = await page.evaluate(() => {
      return (window as unknown as { __geomapHarness: { alternative(): Array<{ entityId: string; type: string; name: string; location: string }> } }).__geomapHarness.alternative();
    });
    expect(alternative.length).toBeGreaterThan(0);
    for (const entity of alternative) {
      expect(entity.name).toBeTruthy();
      expect(entity.location).toBeTruthy();
    }
  });

  test('interaction: select dispatches geomap.entity-selected', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { dispatch(a: unknown): void; snapshot(): { selection: string[] }; events(): Array<{ name: string }> } }).__geomapHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'geom-states-odisha' } });
      const after = h.events();
      const newEvents = after.slice(before).map((e: { name: string }) => e.name);
      return { newEvents, selection: h.snapshot().selection };
    });
    expect(result.selection).toContain('geom-states-odisha');
    expect(result.newEvents).toContain('geomap.entity-selected');
  });

  test('replay: events have monotonic seq order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { events(): Array<{ seq: number }>; dispatch(a: unknown): void } }).__geomapHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'geom-states-odisha' } });
      h.dispatch({ type: 'deselect', target: { id: 'geom-states-odisha' } });
      const after = h.events();
      return { grew: after.length > before + 4, seqs: after.map((e) => e.seq) };
    });
    expect(result.grew).toBe(true);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('data fidelity: tryCreate rejects an unknown projection type', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { tryCreate(s: unknown): { ok: boolean } } }).__geomapHarness;
      return h.tryCreate({
        type: 'geomap',
        version: '1.0.0',
        id: 'bad-proj',
        content: {
          projection: { type: 'orthographic' },
          geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 0, lon: 0 } } }],
          layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
        },
      });
    });
    expect(result.ok).toBe(false);
  });

  test('data fidelity: missing featureId reference fails with INVALID_REFERENCE', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__geomapHarness;
      return h.tryCreate({
        type: 'geomap',
        version: '1.0.0',
        id: 'ghost-feature',
        content: {
          projection: { type: 'equirectangular' },
          geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'ghost', type: 'state', name: 'Ghost', location: { source: 'src', featureId: 'nonexistent' } }],
          layers: [{ id: 'l', type: 'region', items: [{ entity: 'ghost' }] }],
        },
      });
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_REFERENCE');
  });

  test('data fidelity: out-of-range lat/lon in source geometry fails with INVALID_ENTITY', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__geomapHarness;
      return h.tryCreate({
        type: 'geomap',
        version: '1.0.0',
        id: 'bad-geom',
        content: {
          projection: { type: 'equirectangular' },
          geography: {
            sources: [
              {
                id: 'src',
                type: 'geojson',
                class: 'illustrative',
                data: {
                  type: 'FeatureCollection',
                  features: [{ id: 'r1', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 91], [0, 91], [0, 0]]] } }],
                },
              },
            ],
          },
          entities: [{ id: 'r1', type: 'region', name: 'Bad Region', location: { source: 'src', featureId: 'r1' } }],
          layers: [{ id: 'l', type: 'region', items: [{ entity: 'r1' }] }],
        },
      });
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_ENTITY');
  });

  test('rejection: unknown content key fails with INVALID_SPEC (strict schema)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__geomapHarness;
      return h.tryCreate({
        type: 'geomap',
        version: '1.0.0',
        id: 'bad-key',
        content: {
          projection: { type: 'equirectangular' },
          geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 0, lon: 0 } } }],
          layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt' }] }],
          timeline: [],
        },
      });
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_SPEC');
  });

  test('rejection: unknown "flow" layer type fails strict content schema (INVALID_SPEC)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __geomapHarness: { tryCreate(s: unknown): { ok: boolean; code?: string } } }).__geomapHarness;
      return h.tryCreate({
        type: 'geomap',
        version: '1.0.0',
        id: 'bad-flow',
        content: {
          projection: { type: 'equirectangular' },
          geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 0, lon: 0 } } }],
          layers: [{ id: 'l', type: 'flow', items: [{ entity: 'pt' }] }],
        },
      });
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_SPEC');
  });
});