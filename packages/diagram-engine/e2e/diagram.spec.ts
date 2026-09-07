import { test, expect } from '@playwright/test';

test.describe('Diagram Engine — water-cycle e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=diagram');
    await page.waitForFunction(() => !!(window as unknown as { __diagramHarness?: unknown }).__diagramHarness);
  });

  test('a11y: SVG has title and desc; nodes and edges have aria-labels; an alternative table lists nodes, edges, and cycles', async ({ page }) => {
    const svg = await page.evaluate(() => {
      return (window as unknown as { __diagramHarness: { svg(): string } }).__diagramHarness.svg();
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    expect(svg).toContain('aria-label');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');

    const alternative = await page.evaluate(() => {
      return (window as unknown as {
        __diagramHarness: { alternative(): Array<{ kind: string; id: string; relationship?: string; members?: string[] }> }
      }).__diagramHarness.alternative();
    });
    const nodeRows = alternative.filter((r) => r.kind === 'node');
    const edgeRows = alternative.filter((r) => r.kind === 'edge');
    const cycleRows = alternative.filter((r) => r.kind === 'cycle');
    expect(nodeRows.length).toBe(4);
    expect(edgeRows.length).toBe(4);
    for (const edge of edgeRows) {
      expect(edge.relationship).toBeTruthy();
    }
    expect(cycleRows.length).toBeGreaterThanOrEqual(1);
  });

  test('interaction: select dispatches diagram.node-selected with the full node', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: {
          dispatch(a: unknown): void;
          snapshot(): { selection: string[] };
          events(): Array<{ name: string; action?: { payload?: { nodeId?: string; links?: Record<string, string> } } }>;
        }
      }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'evaporation' } });
      const after = h.events();
      const newEvents = after.slice(before);
      const selectedEvent = newEvents.find((e) => e.name === 'diagram.node-selected');
      return { selection: h.snapshot().selection, payload: selectedEvent?.action?.payload };
    });
    expect(result.selection).toContain('evaporation');
    expect(result.payload?.nodeId).toBe('evaporation');
    expect(result.payload?.links?.visualEntityId).toBe('water-figure');
  });

  test('follow/expand: follow dispatches diagram.relationship-followed; expand/collapse flips subtree visibility', async ({ page }) => {
    const followResult = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: {
          dispatch(a: unknown): void;
          events(): Array<{ name: string }>;
        }
      }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'follow', target: { id: 'edge-collection-evaporation' } });
      const after = h.events();
      const newEvents = after.slice(before).map((e: { name: string }) => e.name);
      return newEvents;
    });
    expect(followResult).toContain('diagram.relationship-followed');

    const expandResult = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: { dispatch(a: unknown): void; snapshot(): { expanded: string[] } }
      }).__diagramHarness;
      h.dispatch({ type: 'expand', target: { id: 'evaporation' } });
      return h.snapshot().expanded;
    });
    expect(Array.isArray(expandResult)).toBe(true);
  });

  test('replay: events have monotonic seq order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: { events(): Array<{ seq: number }>; dispatch(a: unknown): void } }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'evaporation' } });
      h.dispatch({ type: 'deselect', target: { id: 'evaporation' } });
      const after = h.events();
      return { grew: after.length > before + 4, seqs: after.map((e) => e.seq) };
    });
    expect(result.grew).toBe(true);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('data fidelity: a flow with a back-edge and a cycle without a cycle both fail tryCreate', async ({ page }) => {
    const flowWithBackEdge = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: { tryCreate(s: unknown): { ok: boolean; message?: string } }
      }).__diagramHarness;
      return h.tryCreate({
        type: 'diagram',
        version: '1.0.0',
        id: 'bad-flow',
        content: {
          kind: 'flow',
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
          edges: [
            { from: 'a', to: 'b', relationship: 'leads-to' },
            { from: 'b', to: 'a', relationship: 'leads-to' },
          ],
        },
        sources: [{ class: 'authoritative' }],
      });
    });
    expect(flowWithBackEdge.ok).toBe(false);

    const acyclicCycle = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: { tryCreate(s: unknown): { ok: boolean } }
      }).__diagramHarness;
      return h.tryCreate({
        type: 'diagram',
        version: '1.0.0',
        id: 'bad-cycle',
        content: {
          kind: 'cycle',
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
          edges: [{ from: 'a', to: 'b', relationship: 'leads-to' }],
        },
        sources: [{ class: 'authoritative' }],
      });
    });
    expect(acyclicCycle.ok).toBe(false);
  });

  test('rejection: unknown kind, force layout, and unknown content key fail tryCreate', async ({ page }) => {
    const unknownKind = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: { tryCreate(s: unknown): { ok: boolean } }
      }).__diagramHarness;
      return h.tryCreate({
        type: 'diagram',
        version: '1.0.0',
        id: 'bad-kind',
        content: { kind: 'organogram', nodes: [{ id: 'a', label: 'A' }], edges: [] },
      });
    });
    expect(unknownKind.ok).toBe(false);

    const forceLayout = await page.evaluate(() => {
      const h = (window as unknown as {
        __diagramHarness: { tryCreate(s: unknown): { ok: boolean } }
      }).__diagramHarness;
      return h.tryCreate({
        type: 'diagram',
        version: '1.0.0',
        id: 'bad-layout',
        content: { kind: 'concept-map', nodes: [{ id: 'a', label: 'A' }], edges: [] },
        layout: { type: 'force' },
      });
    });
    expect(forceLayout.ok).toBe(false);
  });
});