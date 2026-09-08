import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeoMapEngine } from '../src/engine.js';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import type { LayoutContext } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, '..', 'fixture');
const DOCS_FIXTURE_DIR = join(HERE, '..', '..', '..', 'docs', 'fixtures', 'geomap');

const GENERATE = process.env.GENERATE === '1';
const CTX: LayoutContext = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
const ENGINE = new GeoMapEngine();

function specFrom(relPath: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, relPath), 'utf8')) as unknown;
}

function expectationFiles(name: string, dir: string): { scene: string; svg: string; a11y: string; alternative: string } {
  return {
    scene: join(dir, name, 'expected.scene.json'),
    svg: join(dir, name, 'expected.svg'),
    a11y: join(dir, name, 'expected.a11y.json'),
    alternative: join(dir, name, 'expected.alternative.json'),
  };
}

function renderResult(spec: Record<string, unknown>) {
  const content = spec['content'] as Record<string, unknown>;
  const accessibility = spec['accessibility'] as { label?: string; description?: string } | undefined;
  const scene = layout(
    buildScene(content as never, (id: string) => id),
    CTX,
    (content['viewport'] as never) ?? undefined,
  );
  const result = svgFrom(scene, CTX, accessibility?.label, accessibility?.description);
  return { scene, result };
}

function writeOrCompare(name: string, dir: string, spec: Record<string, unknown>) {
  const { scene, result } = renderResult(spec);
  const files = expectationFiles(name, dir);
  const renders = [
    { file: files.scene, payload: JSON.stringify(scene, null, 2) + '\n' },
    { file: files.svg, payload: result.svg + '\n' },
    { file: files.a11y, payload: JSON.stringify(result.a11y, null, 2) + '\n' },
    { file: files.alternative, payload: JSON.stringify(result.alternative, null, 2) + '\n' },
  ];
  if (GENERATE) {
    for (const r of renders) {
      mkdirSync(dirname(r.file), { recursive: true });
      writeFileSync(r.file, r.payload);
    }
    return;
  }
  for (const r of renders) {
    expect(existsSync(r.file), `missing golden file ${r.file}`).toBe(true);
  }
  expect(JSON.parse(readFileSync(files.scene, 'utf8'))).toEqual(scene);
  expect(readFileSync(files.svg, 'utf8')).toBe(result.svg + '\n');
  expect(JSON.parse(readFileSync(files.a11y, 'utf8'))).toEqual(result.a11y);
  expect(JSON.parse(readFileSync(files.alternative, 'utf8'))).toEqual(result.alternative);
}

const FIXTURES = ['region', 'marker', 'route', 'odisha-coastal'];

function validateFixture(name: string, spec: unknown) {
  const result = ENGINE.validate(spec as never);
  if (GENERATE) {
    return result;
  }
  const expected = JSON.parse(readFileSync(join(FIXTURE_DIR, name, 'validation.json'), 'utf8')) as {
    valid: boolean;
    issues: unknown;
  };
  expect(result.valid).toBe(expected.valid);
  expect(result.issues).toEqual(expected.issues);
  if (!result.valid) {
    console.log(`ISSUES (${name}):`, JSON.stringify(result.issues, null, 2));
  }
  return result;
}

beforeAll(() => {
  if (!GENERATE) {
    for (const name of FIXTURES) {
      for (const rel of ['expected.scene.json', 'expected.svg', 'expected.a11y.json', 'expected.alternative.json']) {
        expect(existsSync(join(FIXTURE_DIR, name, rel)), `missing ${name}/${rel}`).toBe(true);
      }
    }
    const skillExpected = expectationFiles('skill-example', DOCS_FIXTURE_DIR);
    for (const rel of Object.values(skillExpected)) {
      expect(existsSync(rel), `missing ${rel}`).toBe(true);
    }
  }
});

describe('Golden fixture round-trips', () => {
  for (const name of FIXTURES) {
    it(`${name} validates and matches golden output`, () => {
      const spec = specFrom(join(name, 'input.geomap.json')) as Record<string, unknown>;
      const result = validateFixture(name, spec);
      if (!result.valid) return;
      writeOrCompare(name, FIXTURE_DIR, spec);
    });
  }

  it('skill-example (docs) validates and matches golden output', () => {
    const raw = readFileSync(join(DOCS_FIXTURE_DIR, 'skill-example.json'), 'utf8');
    const spec = JSON.parse(raw) as Record<string, unknown>;
    const result = ENGINE.validate(spec as never);
    if (GENERATE) {
      writeOrCompare('skill-example', DOCS_FIXTURE_DIR, spec);
      return;
    }
    expect(result.valid).toBe(true);
    if (!result.valid) {
      console.log('SKILL ISSUES:', JSON.stringify(result.issues, null, 2));
    }
    writeOrCompare('skill-example', DOCS_FIXTURE_DIR, spec);
  });
});