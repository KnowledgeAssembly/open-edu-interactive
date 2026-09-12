import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GeoMapEngine } from '../src/engine.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(HERE, '..', 'fixture', name, 'input.geomap.json'), 'utf8'));
}

function makeHost() {
  const emitted: Array<{ name: string; data?: unknown; seq: number }> = [];
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: (event: { name: string; data?: unknown; seq: number }) => { emitted.push(event); },
    resolveAsset: (id: string) => id,
    get events() { return emitted; },
  };
}

describe('Phase 3 — overlay fixture (layer visibility)', () => {
  const spec = loadFixture('overlay');

  it('authored layer.visible=false is hidden initially and toggle reveals it', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'overlay');
    const snap = instance.snapshot() as unknown as { scene: { semantics: Record<string, { hidden: boolean }> } };
    expect(snap.scene.semantics['geom-boundary']!.hidden).toBe(true);
    expect(snap.scene.semantics['geom-boundary-bd']!.hidden).toBe(true);
    expect(snap.scene.semantics['geom-risk']!.hidden).toBe(false);

    instance.dispatch({ type: 'toggle', target: { id: 'geom-boundary' } });
    const after = instance.snapshot() as unknown as { scene: { semantics: Record<string, { hidden: boolean }> } };
    expect(after.scene.semantics['geom-boundary']!.hidden).toBe(false);
    expect(after.scene.semantics['geom-boundary-bd']!.hidden).toBe(false);
  });

  it('toggle risk layer hides its regions', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'overlay');
    instance.dispatch({ type: 'toggle', target: { id: 'geom-risk' } });
    const snap = instance.snapshot() as unknown as {
      scene: { semantics: Record<string, { hidden: boolean }> };
      displayState: { hiddenLayerIds: string[] };
    };
    expect(snap.displayState.hiddenLayerIds).toContain('geom-risk');
    expect(snap.scene.semantics['geom-risk-nz']!.hidden).toBe(true);
    expect(snap.scene.semantics['geom-risk-sz']!.hidden).toBe(true);
    expect(snap.scene.semantics['geom-boundary-bd']!.hidden).toBe(true);
  });
});

describe('Phase 3 — route-step fixture', () => {
  const spec = loadFixture('route-step');

  it('scale bar is present and valid', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'route-step');
    const snap = instance.snapshot() as unknown as { scaleBar: { lengthPx: number; unit: string; label: string } };
    expect(snap.scaleBar.lengthPx).toBeGreaterThan(0);
    expect(snap.scaleBar.unit).toBe('km');
    expect(snap.scaleBar.label.length).toBeGreaterThan(0);
    const svgSnap = instance.snapshot() as unknown as { svgResult: { svg: string } };
    expect(svgSnap.svgResult.svg).toContain('data-oedu-role="scale-bar"');
  });

  it('stepping through route sets completed/active roles', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'route-step');
    instance.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
    instance.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
    instance.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
    const snap = instance.snapshot() as unknown as {
      scene: { semantics: Record<string, { role: string }> };
      displayState: { activeRouteSteps: Record<string, number> };
    };
    expect(snap.displayState.activeRouteSteps['geom-journey-r1']).toBe(3);
    expect(snap.scene.semantics['geom-journey-r1-seg-0']!.role).toBe('route-completed');
    expect(snap.scene.semantics['geom-journey-r1-seg-1']!.role).toBe('route-completed');
    expect(snap.scene.semantics['geom-journey-r1-seg-2']!.role).toBe('route-completed');
    expect(snap.scene.semantics['geom-journey-r1-seg-3']!.role).toBe('route-active');
  });

  it('scrub jumps directly to a step', () => {
    const engine = new GeoMapEngine();
    const host = makeHost();
    const instance = engine.instantiate(spec as never, host, 'route-step');
    instance.dispatch({ type: 'scrub', target: { id: 'geom-journey-r1' }, payload: { step: 2 } });
    const snap = instance.snapshot() as unknown as {
      scene: { semantics: Record<string, { role: string }> };
      displayState: { activeRouteSteps: Record<string, number> };
    };
    expect(snap.displayState.activeRouteSteps['geom-journey-r1']).toBe(2);
    expect(snap.scene.semantics['geom-journey-r1-seg-1']!.role).toBe('route-completed');
    expect(snap.scene.semantics['geom-journey-r1-seg-2']!.role).toBe('route-active');
  });

  it('replay reproduces identical scene + displayState (P4)', () => {
    const run = (): { scene: string; displayState: string; filter: string[] } => {
      const engine = new GeoMapEngine();
      const host = makeHost();
      const instance = engine.instantiate(spec as never, host, 'route-step');
      instance.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
      instance.dispatch({ type: 'scrub', target: { id: 'geom-journey-r1' }, payload: { step: 2 } });
      instance.dispatch({ type: 'scrub', target: { id: 'geom-journey-r1' }, payload: { step: 1 } });
      const snap = instance.snapshot() as unknown as { scene: unknown; displayState: unknown; filter: string[] };
      return {
        scene: JSON.stringify(snap.scene),
        displayState: JSON.stringify(snap.displayState),
        filter: snap.filter,
      };
    };
    expect(run()).toEqual(run());
  });
});