import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mountEngine } from '../src/mount-engine.js';

const ROOT = join(process.cwd(), '..', '..');
const CATALOG = JSON.parse(
  readFileSync(join(ROOT, 'packages/dev-harness/generated/fixture-catalog.json'), 'utf8'),
) as Array<{
  id: string;
  kind: string;
  engine?: string;
  specPath: string;
  golden?: { svg?: string; scene?: string; a11y?: string; alternative?: string };
}>;

const ENGINE_FIXTURES = CATALOG.filter((e) => e.kind === 'engine' && e.engine);
const PRIMITIVE_RE = /<(path|line|circle|rect|polygon|ellipse|text|polyline)([ >])/;
const EMPTY_G_RE = /<g\b[^>]*>\s*<\/g\s*>/;

function loadSpec(fixture: (typeof ENGINE_FIXTURES)[number]) {
  return JSON.parse(readFileSync(join(ROOT, fixture.specPath), 'utf8'));
}

function mountSvg(spec: unknown, id: string): { svg: string; teardown: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const mounted = mountEngine(spec as Parameters<typeof mountEngine>[0], container, { instanceId: id });
  const snap = mounted.snapshot() as { svgResult?: { svg?: string } };
  const svg = snap.svgResult?.svg ?? '';
  const teardown = () => {
    mounted.teardown();
    container.remove();
  };
  return { svg, teardown };
}

describe('A3 honest-slice audit — every catalog engine fixture renders real, non-hollow primitives', () => {
  it('audits every catalogued engine fixture', () => {
    expect(ENGINE_FIXTURES.length).toBeGreaterThan(0);
  });

  for (const fixture of ENGINE_FIXTURES) {
    const spec = loadSpec(fixture);

    it(`${fixture.engine}/${fixture.id.split('/')[1]}: rendered SVG is non-empty and contains a real primitive`, () => {
      const { svg, teardown } = mountSvg(spec, `${fixture.id}-audit`);
      try {
        expect(svg.length).toBeGreaterThan(0);
        expect(PRIMITIVE_RE.test(svg), `no drawing primitive in SVG for ${fixture.id}`).toBe(true);
      } finally {
        teardown();
      }
    });

    it(`${fixture.engine}/${fixture.id.split('/')[1]}: no empty <g> hollow leaf (visible leaves render a primitive)`, () => {
      const { svg, teardown } = mountSvg(spec, `${fixture.id}-hollow`);
      try {
        expect(EMPTY_G_RE.test(svg), `empty <g> hollow leaf found in ${fixture.id}`).toBe(false);
      } finally {
        teardown();
      }
    });

    it(`${fixture.engine}/${fixture.id.split('/')[1]}: deterministic — two mounts produce identical SVG`, () => {
      const a = mountSvg(spec, `${fixture.id}-det1`);
      const b = mountSvg(spec, `${fixture.id}-det2`);
      try {
        expect(b.svg).toBe(a.svg);
      } finally {
        a.teardown();
        b.teardown();
      }
    });
  }

  it('golden expected.svg is byte-stable against the renderer for every fixture that declares one', () => {
    for (const fixture of ENGINE_FIXTURES) {
      if (!fixture.golden?.svg) continue;
      const spec = loadSpec(fixture);
      const { svg, teardown } = mountSvg(spec, `${fixture.id}-golden`);
      try {
        const expected = readFileSync(join(ROOT, fixture.golden.svg), 'utf8');
        expect(svg, `golden mismatch: ${fixture.id}`).toBe(expected);
      } finally {
        teardown();
      }
    }
  });
});

describe('A3 no-library guard — engines never import rendering libraries', () => {
  const FORBIDDEN = ['d3', 'dagre', 'elk', 'recharts', 'maplibre', 'mapbox', 'konva', 'leaflet'];
  const engines = readdirSync(join(ROOT, 'packages')).filter((p) => p.endsWith('-engine'));

  function walkTs(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, e.name);
      if (e.isDirectory()) walkTs(f, acc);
      else if (e.name.endsWith('.ts')) acc.push(f);
    }
    return acc;
  }

  function forbiddenImport(file: string, lib: string): boolean {
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import') && !trimmed.startsWith('export')) continue;
      const m = trimmed.match(/from\s+['"]([^'"]+)['"]/);
      if (!m) continue;
      const specifier = m[1]!;
      if (specifier.startsWith('.')) continue;
      if (specifier.split('/')[0] === lib) return true;
    }
    return false;
  }

  for (const pkg of engines) {
    it(`${pkg}: src imports contain no rendering-graph/chart/map library`, () => {
      const srcDir = join(ROOT, 'packages', pkg, 'src');
      if (!existsSync(srcDir)) return;
      for (const file of walkTs(srcDir)) {
        for (const lib of FORBIDDEN) {
          expect(forbiddenImport(file, lib), `${file} imports forbidden library "${lib}"`).toBe(false);
        }
      }
    });
  }
});
