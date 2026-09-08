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

describe('fixture catalog completeness', () => {
  it('every engine fixture dir with input.*.json appears in catalog', async () => {
    const catalog = JSON.parse(
      await readFile(join(ROOT, 'packages/dev-harness/generated/fixture-catalog.json'), 'utf8'),
    );
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
    const catalog = JSON.parse(
      await readFile(join(ROOT, 'packages/dev-harness/generated/fixture-catalog.json'), 'utf8'),
    );
    for (const entry of catalog) {
      const full = join(ROOT, entry.specPath);
      await expect(readFile(full, 'utf8')).resolves.toBeDefined();
    }
  });
});
