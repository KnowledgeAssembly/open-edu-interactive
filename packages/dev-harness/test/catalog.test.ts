import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(process.cwd(), '..', '..');

function engineTypeFromDir(name) {
  const m = name.match(/^(.+)-engine$/);
  return m ? m[1] : null;
}

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function getCatalog() {
  return JSON.parse(
    await readFile(join(ROOT, 'packages/dev-harness/generated/fixture-catalog.json'), 'utf8'),
  );
}

describe('fixture catalog completeness', () => {
  it('every engine fixture dir with input.*.json appears in catalog', async () => {
    const catalog = await getCatalog();
    const catalogIds = new Set(catalog.map((e) => e.id));

    const packagesDir = join(ROOT, 'packages');
    const pkgs = await readdir(packagesDir);
    for (const pkg of pkgs) {
      const engineType = engineTypeFromDir(pkg);
      if (!engineType) continue;
      const fixtureDir = join(packagesDir, pkg, 'fixture');
      try {
        await readdir(fixtureDir);
      } catch {
        continue;
      }
      const inputs = (await walk(fixtureDir)).filter((f) => f.split('/').pop().startsWith('input.'));
      for (const input of inputs) {
        const slug = input.split('/').slice(-2, -1)[0];
        const id = `${engineType}/${slug}`;
        expect(catalogIds.has(id)).toBe(true);
      }
    }
  });

  it('catalog entries reference existing spec files', async () => {
    const catalog = await getCatalog();
    for (const entry of catalog) {
      const full = join(ROOT, entry.specPath);
      await expect(readFile(full, 'utf8')).resolves.toBeDefined();
    }
  });

  it('docs fixtures classified correctly', async () => {
    const catalog = await getCatalog();
    const docsEntries = catalog.filter((e) => e.specPath.startsWith('docs/fixtures/'));
    const compositionEntries = docsEntries.filter((e) => e.kind === 'composition');
    const engineDocsEntries = docsEntries.filter((e) => e.kind === 'engine');

    expect(docsEntries.some((e) => e.slug.includes('widget-compat'))).toBe(false);
    expect(docsEntries.some((e) => e.slug === 'engine-reps')).toBe(false);

    expect(compositionEntries.some((e) => e.id === 'lesson/narrative-timeline-visual')).toBe(true);
    expect(compositionEntries.some((e) => e.id === 'lesson/composed-lesson')).toBe(true);

    expect(engineDocsEntries.some((e) => e.id === 'timeline/skill-example' && e.engine === 'timeline')).toBe(true);
    expect(engineDocsEntries.some((e) => e.id === 'geomap/skill-example' && e.engine === 'geomap')).toBe(true);
    expect(engineDocsEntries.some((e) => e.id === 'diagram/skill-example' && e.engine === 'diagram')).toBe(true);
  });

  it('golden svg paths exist on disk when declared', async () => {
    const catalog = await getCatalog();
    for (const entry of catalog) {
      if (!entry.golden?.svg) continue;
      const full = join(ROOT, entry.golden.svg);
      await expect(readFile(full)).resolves.toBeDefined();
    }
  });

  it('titles are populated from data.title or metadata.title', async () => {
    const catalog = await getCatalog();
    for (const entry of catalog) {
      expect(entry.title).toBeTruthy();
      expect(typeof entry.title).toBe('string');
    }
  });
});
