import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VisualEngine } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(__dirname, '..', 'fixture');
const engine = new VisualEngine();

function* walkFixtures(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      yield* walkFixtures(resolve(dir, entry.name));
    } else if (entry.name === 'input.visual.json') {
      yield dir;
    }
  }
}

function makeHost(id) {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (x) => x,
  };
}

for (const dir of walkFixtures(fixtureRoot)) {
  const spec = JSON.parse(readFileSync(join(dir, 'input.visual.json'), 'utf-8'));

  const validation = engine.validate(spec);
  writeFileSync(join(dir, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');

  const inst = engine.instantiate(spec, makeHost(join(dir, 'test')), 'fixture-golden');
  const snap = inst.snapshot();

  writeFileSync(join(dir, 'expected.svg'), snap.svgResult.svg);
  writeFileSync(join(dir, 'expected.scene.json'), JSON.stringify(snap.scene, null, 2) + '\n');
  writeFileSync(join(dir, 'expected.a11y.json'), JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2) + '\n');

  console.log(`regen ${dir.split('/').pop()}: valid=${validation.valid} a11yNodes=${snap.svgResult.a11y.length}`);
}
