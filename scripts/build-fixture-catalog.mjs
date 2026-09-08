#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..');

function engineTypeFromDir(name) {
  const m = name.match(/^(.+)-engine$/);
  return m ? m[1] : null;
}

async function walk(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      out.push(relative(base, full));
    }
  }
  return out;
}

async function buildCatalog() {
  const entries = [];
  const packagesDir = join(REPO, 'packages');
  const pkgs = await readdir(packagesDir);

  for (const pkg of pkgs) {
    const engineType = engineTypeFromDir(pkg);
    if (!engineType) continue;

    const fixtureDir = join(packagesDir, pkg, 'fixture');
    let fixtureFiles;
    try {
      fixtureFiles = await walk(fixtureDir, fixtureDir);
    } catch {
      continue;
    }

    for (const rel of fixtureFiles) {
      const fileName = rel.split('/').pop();
      if (!fileName.startsWith('input.')) continue;
      const slug = rel.split('/')[0];
      const id = `${engineType}/${slug}`;
      const inputPath = join(fixtureDir, rel);
      const data = JSON.parse(await readFile(inputPath, 'utf8'));
      const title = data?.metadata?.title ?? slug;

      const golden = {};
      for (const ext of ['svg', 'scene', 'a11y', 'alternative', 'validation']) {
        try {
          await readFile(join(fixtureDir, slug, `expected.${ext}.json`));
          golden[ext] = `packages/${pkg}/fixture/${slug}/expected.${ext}.json`;
        } catch {
          // no golden file
        }
      }

      entries.push({
        id,
        kind: 'engine',
        engine: engineType,
        slug,
        specPath: `packages/${pkg}/fixture/${rel}`,
        golden: Object.keys(golden).length > 0 ? golden : undefined,
        title,
      });
    }
  }

  const docsFixtures = join(REPO, 'docs', 'fixtures');
  try {
    const docFiles = await walk(docsFixtures, docsFixtures);
    for (const rel of docFiles) {
      if (!rel.endsWith('.json')) continue;
      if (rel.includes('/expected.')) continue;
      const fullPath = join(docsFixtures, rel);
      const data = JSON.parse(await readFile(fullPath, 'utf8'));
      const isComposed = data.type === 'lesson' || data.purpose?.learningObjective;
      const kind = isComposed ? 'lesson' : 'composition';
      const slug = rel.replace(/\.json$/, '');
      const id = `lesson/${slug}`;
      const title = data?.metadata?.title ?? data?.purpose?.learningObjective ?? slug;

      entries.push({
        id,
        kind,
        slug,
        specPath: `docs/fixtures/${rel}`,
        title,
      });
    }
  } catch {
    // no docs/fixtures
  }

  const outDir = join(REPO, 'packages', 'dev-harness', 'generated');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'fixture-catalog.json'), JSON.stringify(entries, null, 2) + '\n');
  console.log(`Fixture catalog: ${entries.length} entries`);
}

buildCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
