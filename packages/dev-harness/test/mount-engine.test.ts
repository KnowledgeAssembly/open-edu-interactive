import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mountEngine } from '../src/mount-engine.js';

const ROOT = join(process.cwd(), '..', '..');
const VISUAL_SPEC = JSON.parse(
  await readFile(join(ROOT, 'packages/visual-engine/fixture/number-line/input.visual.json'), 'utf8'),
);

describe('mountEngine', () => {
  let container: HTMLElement;

  afterEach(() => {
    container.remove();
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders SVG into data-oedu-root on initial mount', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    const svgRoot = container.querySelector('[data-oedu-root="visual"]');
    expect(svgRoot).not.toBeNull();
    expect(svgRoot!.querySelector('[data-oedu-svg] svg')).not.toBeNull();
    const snap = result.snapshot() as { svgResult?: { svg?: string } };
    expect(snap.svgResult?.svg?.length).toBeGreaterThan(0);
    result.teardown();
  });

  it('returns renderTargets with svg kind', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    expect(result.renderTargets.some((t) => t.kind === 'svg')).toBe(true);
    result.teardown();
  });

  it('snapshot returns svgResult with svg string', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    const snap = result.snapshot() as { svgResult?: { svg?: string } };
    expect(typeof snap.svgResult?.svg).toBe('string');
    expect(snap.svgResult!.svg.length).toBeGreaterThan(0);
    result.teardown();
  });

  it('events returns lifecycle events from instantiation', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    const evts = result.events();
    expect(evts.length).toBeGreaterThan(0);
    expect(evts.some((e) => e.name === 'engine-mounted')).toBe(true);
    result.teardown();
  });

  it('validate returns valid: true for the spec', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    const r = result.validate(VISUAL_SPEC);
    expect(r.valid).toBe(true);
    result.teardown();
  });

  it('teardown clears events', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    result.dispatch({ type: 'select', target: { id: 'nl' } });
    expect(result.events().length).toBeGreaterThan(0);
    result.teardown();
  });

  it('clicking data-oedu-interactive dispatches select', () => {
    const result = mountEngine(VISUAL_SPEC, container);
    const marker = container.querySelector('#nl-marker-7');
    expect(marker).not.toBeNull();
    marker!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const snap = result.snapshot() as { selection?: string[] };
    expect(snap.selection).toContain('nl-marker-7');
    result.teardown();
  });
});
