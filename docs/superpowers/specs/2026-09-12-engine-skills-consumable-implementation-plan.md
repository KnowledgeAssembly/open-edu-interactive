# Implementation Plan — `@knowledgeassemble/engine-skills`

**Date:** 2026-09-12  
**Design spec:** `docs/superpowers/specs/2026-09-12-engine-skills-consumable-design.md`  
**Branch:** `feat/engine-skills-package` from current `main`  
**Target model:** deepseek-4-flash (agentic implementation; plan is written as bounded, test-first tasks with explicit file paths and verification commands)

> Execute tasks in order. Each task has a "Done when" gate; do not start the next task until the current gate is green. The final gate is the repo's full exit gate.

---

## 0. Pre-flight (read first)

Read, in this order:
1. `docs/superpowers/specs/2026-09-12-engine-skills-consumable-design.md` — this work implements that design.
2. `docs/DESIGN.md` §8, §13, §15 D6/D7, §16 — non-negotiable invariants.
3. `docs/STRUCTURE.md` §7, §40–41 — packaging and publishing conventions.
4. One existing engine package, e.g. `packages/chart-engine/`, as the package-shape template.

Run once to baseline:
```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```
If this is not green, stop and report why.

---

## 1. Scaffold `packages/engine-skills/`

Create the package skeleton mirroring engine conventions.

### Files

- `packages/engine-skills/package.json`
- `packages/engine-skills/tsconfig.json`
- `packages/engine-skills/tsconfig.build.json`
- `packages/engine-skills/vitest.config.ts`
- `packages/engine-skills/README.md`
- `packages/engine-skills/.gitignore` (dist, node_modules)

### `package.json` requirements

```json
{
  "name": "@knowledgeassemble/engine-skills",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["manifest.json", "skills/**", "src", "dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "generate": "node scripts/generate-skills.mjs",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src test scripts",
    "test": "vitest run",
    "prepublishOnly": "pnpm generate && pnpm build && pnpm typecheck && pnpm lint && pnpm test"
  },
  "dependencies": {
    "@knowledgeassemble/interactive-engine": "workspace:*",
    "ajv": "^8.20.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@knowledgeassemble/chart-engine": "workspace:*",
    "@knowledgeassemble/diagram-engine": "workspace:*",
    "@knowledgeassemble/geomap-engine": "workspace:*",
    "@knowledgeassemble/timeline-engine": "workspace:*",
    "@knowledgeassemble/visual-engine": "workspace:*",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

Notes:
- `dependencies` only what runtime consumers need: core contract, ajv, zod.
- `devDependencies` include all five standalone engine packages + composition host (`interactive-engine`) so generation can read kind enums and validate examples.
- `files` must ship generated `manifest.json` and `skills/**`; do **not** rely on `src` alone.

### `tsconfig.json` / `tsconfig.build.json`

Copy from `packages/chart-engine/tsconfig.json` and `tsconfig.build.json`, adjust `rootDir`/`outDir` to `./src` and `./dist`. Preserve strict mode + `noUncheckedIndexedAccess` + `module: "NodeNext"` + `.js` import specifiers.

### `vitest.config.ts`

Copy from `packages/chart-engine/vitest.config.ts`.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills typecheck
```
runs green (it will be empty src for now; that is fine).

---

## 2. Create canonical `skill-example.json` sources for visual and chart

Two engines have inline examples but no file fixture. Extract them and check them in as the in-repo source of truth.

### Files

- `docs/fixtures/visual/skill-example.json`
- `docs/fixtures/chart/skill-example.json`

### Content

From `docs/engines/visual/skills/educational-visual/SKILL.md` lines 167–186, extract the `example-nl` envelope spec into `docs/fixtures/visual/skill-example.json`.

From `docs/engines/chart/skills/quantitative-chart/SKILL.md` lines 16–37, extract the `rainfall-monthly` envelope spec into `docs/fixtures/chart/skill-example.json`.

If either extracted example is missing required envelope fields, add the minimal valid values and record the normalization in the commit message.

### Done when

Both files exist, are valid JSON, and round-trip against their engine's runtime validator:

```bash
node -e "import('@knowledgeassemble/visual-engine').then(m=>console.log(m.VisualEngine.validate((await import('fs')).readFileSync('docs/fixtures/visual/skill-example.json','utf8'))))"
# expect { valid: true, issues: [] }
node -e "import('@knowledgeassemble/chart-engine').then(m=>console.log(m.ChartEngine.validate((await import('fs')).readFileSync('docs/fixtures/chart/skill-example.json','utf8'))))"
# expect { valid: true, issues: [] }
```

Use a small temporary test script if the one-liner is unwieldy.

---

## 3. Implement `src/manifest.ts`

Types and load helpers for `manifest.json`.

### File

`packages/engine-skills/src/manifest.ts`

### Required exports

```ts
export interface ValidationContract {
  package: string;
  symbol: string;
  method: string;
}

export interface EngineSkillEntry {
  type: string;
  skill: string;
  kinds: string[];
  skillDoc: string;
  schema: string;
  example: string;
  validationContract: ValidationContract;
  namespacedEvents: string[];
}

export interface EngineSkillsManifest {
  package: string;
  version: string;
  schemaVersion: number;
  engines: EngineSkillEntry[];
}

export declare const MANIFEST_PATH: string;
export declare const MANIFEST: EngineSkillsManifest;

export declare function getEngineEntry(type: string): EngineSkillEntry | undefined;
export declare function loadSkillDoc(type: string): string;
export declare function loadSchema(type: string): unknown;
export declare function loadSkillExample(type: string): unknown;
```

Implementation notes:
- `MANIFEST_PATH` resolves to `manifest.json` relative to package root.
- Loaders resolve package-relative paths using `import.meta.url`.
- Use `fs.readFileSync` + `JSON.parse`; return `unknown` for schema/example to keep consumers strict.

### Done when

`pnpm --filter @knowledgeassemble/engine-skills typecheck` is green (the file compiles; tests come later).

---

## 4. Implement `src/validate-example.ts`

Ajv round-trip helper.

### File

`packages/engine-skills/src/validate-example.ts`

### Required export

```ts
export declare function validateSkillExample(type: string): {
  valid: boolean;
  errors: string[];
};
```

Behavior:
1. Load `loadSchema(type)` and `loadSkillExample(type)`.
2. Compile schema with Ajv (draft-2020-12, strict mode).
3. Validate example.
4. Return `{ valid: true, errors: [] }` or `{ valid: false, errors: [...] }`.

### Done when

`pnpm --filter @knowledgeassemble/engine-skills typecheck` is green.

---

## 5. Implement `src/index.ts`

Public surface.

### File

`packages/engine-skills/src/index.ts`

### Required content

```ts
export { MANIFEST, MANIFEST_PATH } from './manifest.js';
export type {
  EngineSkillsManifest,
  EngineSkillEntry,
  ValidationContract,
} from './manifest.js';
export {
  loadSkillDoc,
  loadSchema,
  loadSkillExample,
  getEngineEntry,
} from './manifest.js';
export { validateSkillExample } from './validate-example.js';
export { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
export type { ActionType } from '@knowledgeassemble/interactive-engine';
```

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills build
pnpm --filter @knowledgeassemble/engine-skills typecheck
```
both green and `dist/index.js` + `dist/index.d.ts` exist.

---

## 6. Implement generator `scripts/generate-skills.mjs`

This is the central build artifact. It produces `manifest.json` and the `skills/<engine>/` directory contents.

### File

`packages/engine-skills/scripts/generate-skills.mjs`

### Inputs (read from repo)

| Engine | SKILL.md source | Schema source | Example source |
|--------|-----------------|---------------|----------------|
| `visual` | `docs/engines/visual/skills/educational-visual/SKILL.md` | compose envelope + `packages/visual-engine/src/schemas/visual-spec.schema.json` | `docs/fixtures/visual/skill-example.json` |
| `chart` | `docs/engines/chart/skills/quantitative-chart/SKILL.md` | `packages/chart-engine/src/schemas/chart-spec.schema.json` | `docs/fixtures/chart/skill-example.json` |
| `geomap` | `docs/engines/geomap/skills/geographic-map/SKILL.md` | `packages/geomap-engine/src/schemas/geomap-spec.schema.json` | `docs/fixtures/geomap/skill-example.json` |
| `timeline` | `docs/engines/timeline/skills/temporal-timeline/SKILL.md` | `packages/timeline-engine/src/schemas/timeline-spec.schema.json` | `docs/fixtures/timeline/skill-example.json` |
| `diagram` | `docs/engines/diagram/skills/structural-diagram/SKILL.md` | `packages/diagram-engine/src/schemas/diagram-spec.schema.json` | `docs/fixtures/diagram/skill-example.json` |
| `composition` | `docs/engines/composition/skills/composition/SKILL.md` | `docs/schemas/composition.schema.json` | `docs/fixtures/composition/skill-example.json` |

Envelope schema source: `packages/interactive-engine/src/schemas/interactive-engine.schema.json`.

Kind constant sources (imported at generator runtime):
- `visual`: `@knowledgeassemble/visual-engine` → `VISUAL_KINDS`
- `chart`: `@knowledgeassemble/chart-engine` → `CHART_KINDS`
- `diagram`: `@knowledgeassemble/diagram-engine` → `DIAGRAM_KINDS`
- `geomap`: no `content.kind`; `kinds: []`
- `timeline`: no exported kind constant; derive from `content.kind` in `timeline-spec.schema.json` (expected `['events']`), else `[]`
- `composition`: no kinds; `kinds: []`

Rule: if the engine has a closed `content.kind` enum, populate `kinds` from the exported constant when available, otherwise from the schema's `content.kind.enum`. If the engine has no `content.kind` (e.g. geomap), use `[]`.

Do not invent kind values.

### Outputs (written to `packages/engine-skills/`)

- `manifest.json`
- `skills/<engine>/SKILL.md`
- `skills/<engine>/schema.json`
- `skills/<engine>/skill-example.json`

### Generator rules

1. **SKILL.md rewrite**: replace in-repo paths with package-relative paths:
   - `packages/<engine>/src/schemas/<e>-spec.schema.json` → `./schema.json`
   - `docs/schemas/composition.schema.json` → `./schema.json`
   - `docs/fixtures/<engine>/skill-example.json` → `./skill-example.json`
   - `ChartEngine.validate(spec)` / `VisualEngine.validate(spec)` → reference `validationContract` in manifest
   Keep the prose verbatim apart from these substitutions.

2. **schema.json**:
   - For `chart`, `diagram`, `geomap`, `timeline`: copy the existing full-envelope schema as-is.
   - For `composition`: copy `docs/schemas/composition.schema.json` as-is.
   - For `visual`: produce a self-contained full spec schema by composing the envelope schema with the visual content schema. At minimum: take envelope schema, set `properties.content` to the visual content schema, and add `content` to `required`. Also set `properties.type.const = "visual"` if the envelope does not already constrain it.

3. **skill-example.json**: copy from the fixture source.

4. **manifest.json**: build from `package.json` version and kind constants; include `validationContract` per engine (see design spec §3.1). For composition use `{ package: "@knowledgeassemble/interactive-engine", symbol: "Lesson", method: "load" }`.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills generate
```
runs green and produces all six `skills/<engine>/` directories plus `manifest.json`.

---

## 7. Add tests

### Files

- `packages/engine-skills/test/manifest.test.ts`
- `packages/engine-skills/test/schema-roundtrip.test.ts`
- `packages/engine-skills/test/full-spec-schema.test.ts`

### `manifest.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { MANIFEST, getEngineEntry } from '../src/manifest.js';
import { VISUAL_KINDS } from '@knowledgeassemble/visual-engine';
import { CHART_KINDS } from '@knowledgeassemble/chart-engine';
import { DIAGRAM_KINDS } from '@knowledgeassemble/diagram-engine';

describe('manifest', () => {
  it('has six engines', () => {
    expect(MANIFEST.engines).toHaveLength(6);
  });

  it('visual kinds match VISUAL_KINDS', () => {
    const entry = getEngineEntry('visual')!;
    expect(entry.kinds.slice().sort()).toEqual([...VISUAL_KINDS].sort());
  });

  it('chart kinds match CHART_KINDS', () => {
    const entry = getEngineEntry('chart')!;
    expect(entry.kinds.slice().sort()).toEqual([...CHART_KINDS].sort());
  });

  it('diagram kinds match DIAGRAM_KINDS', () => {
    const entry = getEngineEntry('diagram')!;
    expect(entry.kinds.slice().sort()).toEqual([...DIAGRAM_KINDS].sort());
  });

  it('timeline kind is [events]', () => {
    const entry = getEngineEntry('timeline')!;
    expect(entry.kinds).toEqual(['events']);
  });

  it('geomap and composition have empty kinds', () => {
    expect(getEngineEntry('geomap')!.kinds).toEqual([]);
    expect(getEngineEntry('composition')!.kinds).toEqual([]);
  });

  it('every entry has a validationContract with package, symbol, method', () => {
    for (const e of MANIFEST.engines) {
      expect(e.validationContract.package).toMatch(/^@knowledgeassemble\//);
      expect(e.validationContract.symbol).toBeTruthy();
      expect(e.validationContract.method).toBeTruthy();
    }
  });
});
```

### `schema-roundtrip.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { validateSkillExample } from '../src/validate-example.js';

const ENGINES = ['visual', 'chart', 'geomap', 'timeline', 'diagram', 'composition'];

describe('skill-example round-trip', () => {
  for (const type of ENGINES) {
    it(`${type} example validates against its schema`, () => {
      const result = validateSkillExample(type);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});
```

### `full-spec-schema.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { loadSchema, loadSkillExample } from '../src/manifest.js';

describe('visual full-spec schema', () => {
  it('validates a full envelope example, not only content', () => {
    const schema = loadSchema('visual') as Record<string, unknown>;
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('content');
    const ajv = new Ajv({ strict: true });
    const validate = ajv.compile(schema);
    expect(validate(loadSkillExample('visual'))).toBe(true);
  });
});
```

Fix the test code above as needed.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills test
```
is green.

---

## 8. Wire generation into build and CI freshness

### Changes

1. Add to root `package.json` scripts (if a root generate script exists) or to the package scripts:
   - `"generate:skills": "pnpm --filter @knowledgeassemble/engine-skills generate"`
   - Ensure `prebuild` or `build` runs `generate` for this package.

2. Add a CI freshness check. Create `scripts/check-engine-skills-fresh.mjs` at repo root that:
   - Runs `pnpm --filter @knowledgeassemble/engine-skills generate`
   - Runs `git diff --exit-code packages/engine-skills/manifest.json packages/engine-skills/skills/`
   - Exits non-zero if there is a diff.

3. Add the freshness check to the full exit gate (see Task 11).

### Done when

```bash
node scripts/check-engine-skills-fresh.mjs
```
returns 0 immediately after a clean generation.

---

## 9. Update installed-package smoke

The existing smoke (`scripts/p7-publish-smoke.mjs` or similar) should verify the new package too.

### Changes

Extend the smoke script to:
1. Pack and install `@knowledgeassemble/engine-skills` into a temp consumer.
2. Import `{ MANIFEST, validateSkillExample }` from the installed package.
3. Call `validateSkillExample` for all six engines and assert all are valid.
4. Read `MANIFEST.engines` and assert length === 6.

If the smoke script does not exist yet, create a minimal version in `packages/engine-skills/scripts/install-smoke.mjs`.

### Done when

```bash
pnpm publish:dry
# or the package-specific smoke script
```
passes and exercises the new package.

---

## 10. Add workspace registration

Ensure the new package is part of the pnpm workspace.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills test
pnpm --filter @knowledgeassemble/engine-skills build
pnpm --filter @knowledgeassemble/engine-skills lint
```
all run from repo root without path errors.

---

## 11. Final verification (full exit gate)

Run the repo's full exit gate plus the new freshness check:

```bash
pnpm --filter @knowledgeassemble/engine-skills generate
node scripts/check-engine-skills-fresh.mjs
pnpm typecheck
pnpm lint
pnpm -w test
pnpm playwright
pnpm publish:dry
```

All must be green.

### Done when

- All commands above pass.
- `git status` shows only intended changes: new `packages/engine-skills/`, new `docs/fixtures/visual/skill-example.json`, new `docs/fixtures/chart/skill-example.json`, updated root/package scripts if any.
- No drift in generated `manifest.json` / `skills/<engine>/` files relative to in-repo sources.

---

## 12. Commit and PR

1. Stage intended files.
2. Inspect `git diff` to ensure no unrelated changes.
3. Commit per task/phase:
   - `P8 T1: scaffold @knowledgeassemble/engine-skills package`
   - `P8 T2: add visual and chart skill-example fixtures`
   - `P8 T3-5: manifest, validate-example, index public surface`
   - `P8 T6: generate-skills.mjs generator for all six engines`
   - `P8 T7: manifest, schema round-trip, and full-spec schema tests`
   - `P8 T8-9: CI freshness guard and installed-package smoke`
   - `P8 T11: full exit gate green`
4. Open PR: `gh pr create --title "P8: publishable @knowledgeassemble/engine-skills package"`.
5. Merge with `gh pr merge <n> --merge --delete-branch` after review.

---

## Agent notes

- Do **not** modify engine runtime code. If a test fails because an engine schema is missing a property, fix the generator or the example, not the engine.
- Do **not** add `@open-edu/*` imports anywhere.
- Keep all relative imports with `.js` specifiers (`module: "NodeNext"`).
- No emojis in files or commits.
- If a kind enum is not exported from an engine package, read it from the schema JSON and leave a comment in the generator explaining the fallback.
- If the visual full-spec schema composition proves difficult, spike a minimal merge first (envelope + content required), get the test green, then refine.