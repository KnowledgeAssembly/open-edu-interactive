# Engine Skills → OpenEdu-Consumable — Design

**Date:** 2026-09-12
**Status:** Approved design (req. explore + approve)
**Scope:** Make the six engine authoring skills consumable by OpenEdu — both the external `openedu-course-authoring` agent skill and the Studio dev-server companion runtime — via one canonical published artifact.
**Plan home:** new implementation plan; record as Workstream follow-up in `docs/PLAN.md` §11 when scheduled.

> **Normative inputs.** `docs/DESIGN.md` (§8, §13, §15 D6/D7, §16), `docs/STRUCTURE.md` (§7, §40–41), `open-edu ADR-0009` (derivation model, schemaVersion, committed-generated-artifacts discipline), `packages/interactive-engine/src/index.ts` (public surface), each `docs/engines/*/skills/*/SKILL.md`.

---

## 1. Problem

Six agent authoring skills exist in this repo — one per engine — as in-repo Markdown:

| Engine | Skill | Canonical example |
|--------|-------|-------------------|
| `visual` | `educational-visual` | inline in SKILL.md (no `skill-example.json`) |
| `chart` | `quantitative-chart` | inline in SKILL.md (no `skill-example.json`) |
| `geomap` | `geographic-map` | `docs/fixtures/geomap/skill-example.json` |
| `timeline` | `temporal-timeline` | `docs/fixtures/timeline/skill-example.json` |
| `diagram` | `structural-diagram` | `docs/fixtures/diagram/skill-example.json` |
| `composition` | `composition` | `docs/fixtures/composition/skill-example.json` |

They are **not consumable by OpenEdu** today:

1. **Not published.** `@knowledgeassemble/*` packages ship `files: ["src","dist"]` only; the SKILL.md files, examples, and schema JSONs never leave this repo. OpenEdu has no path to load them.
2. **Not discovered.** There is no manifest saying "these skills exist, what each covers, and how to validate against it." OpenEdu cannot enumerate engines/kinds without reading this repo.
3. **Not portable.** Each SKILL.md's validation steps reference in-repo paths (`packages/chart-engine/src/schemas/chart-spec.schema.json`, `ChartEngine.validate`) that fail in any consumer context. Schema JSONs ship inside `src/schemas/` but are **not addressable** — no subpath export — so a consumer hits `ERR_PACKAGE_PATH_NOT_EXPORTED`.
4. **Not versioned as content.** Engine packages version the *code*; the skill guidance and examples version with no explicit relationship to `schemaVersion` of the artifacts they author.

OpenEdu wants to consume them **symmetrically** (ADR-0009: external skill + companion runtime derive from one canonical source). Without a published, portable, manifest-driven artifact, OpenEdu would either re-author the guidance (duplication ADR-0009 exists to kill) or re-render it from this repo's internals (coupling that violates D2 publish-and-consume).

## 2. Goals

| Goal | Detail |
|------|--------|
| One canonical artifact | A published npm package bundling all six skills + per-engine schema + example + machine-readable manifest |
| Portable validation | Skills validate their example via paths that work in any consumer (local `schema.json` + ajv, runtime via manifest `validationContract`) |
| Symmetric consumption | External `openedu-course-authoring` skill AND Studio companion both consume the same artifact, symmetrically with ADR-0009 |
| No second source of truth | The package is the authoritative view for *authoring guidance*; OpenEdu's `domain-guidance` derives structured views from it, never re-declares |
| Engine isolation kept | No `@open-edu/*` import anywhere in this repo (D6/D7); OpenEdu installs the package |
| Deterministic, gated | Manifest content is tested in-repo and in an installed-package smoke; examples round-trip validation |

**Non-goals:** a Studio app (D6); new engine kinds; scoring/hints/assessment logic (D7); changing the frozen kind/enum contracts; forcing OpenEdu's `domain-guidance` implementation (OpenEdu-side item).

## 3. Canonical artifact design

New package **`@knowledgeassemble/engine-skills`** at `packages/engine-skills/`.

```
packages/engine-skills/
  package.json
  manifest.json                # versioned, machine-readable catalog (below)
  README.md                    # consumer orientation: discovery, APIs, validation contract
  skills/<engine>/
    SKILL.md                   # portable rewrite of docs/engines/<e>/skills/<s>/SKILL.md
    schema.json                # copy of the engine's spec schema (ajv-checkable)
    example.json               # canonical example fixture (works on docs + ajv round-trip)
features/
  actions.ts                   # D5 closed action enum (re-exported, structural)
  validate-example.ts          # ajv validation of example.json against schema.json
index.ts                       # public surface (below)
```

- Per-engine skill content is **self-contained** (SKILL.md + schema.json + example.json) so a consumer can load a single engine without walking the repo.
- `package.json` follows engine conventions: ESM (`type: module`), per-file `tsc` emit, `.js` import specifiers, `zod` allowed, no bundler, engine isolation (no `@open-edu/*`).
- `files` must include `manifest.json`, `skills/**`, `schema.json` copies, `dist`. **Not** `src` only.

### 3.1 `manifest.json` (canonical discovery view)

```jsonc
{
  "package": "@knowledgeassemble/engine-skills",
  "version": "0.1.0",
  "schemaVersion": 1,                       // bump on incompatible shape change (ADR-0009 precedent)
  "engines": [
    {
      "type": "visual",
      "skill": "educational-visual",
      "kinds": ["number-line", "counting-set", "fraction", "fraction-comparison",
                "clock", "coordinate-grid", "geometry", "comparison",
                "illustration", "fraction-circle"],
      "skillDoc": "./skills/visual/SKILL.md",
      "schema": "./skills/visual/schema.json",
      "example": "./skills/visual/example.json",
      "validationContract": {
        "package": "@knowledgeassemble/visual-engine",
        "validate": "VisualEngine.validate"
      },
      "namespacedEvents": ["visual.*-selected", "visual.*-focused"]
    }
    // … chart, geomap, timeline, diagram, composition
  ]
}
```

- Field semantics mirror the OpenEdu `widget-catalog-data.json` discovery pattern: agents/companions enumerate `engines[]`, never hardcode engine lists.
- `kinds` are **derived from the engine packages' own kind enums at build/CI time** (`CHART_KINDS`, `DIAGRAM_KINDS`, `VISUAL_KINDS`, …), never hand-typed — keeps the manifest honest against the frozen enums.

## 4. Portability rewrites (the SKILL.md delta)

Each copied SKILL.md's validate/cite steps are rewritten from in-repo paths to **package-relative paths**:

| Today (in-repo) | Published (consumer) |
|------------------|------------------------|
| `packages/<engine>/src/schemas/<e>-spec.schema.json` | `./schema.json` (same file, copied) validate with ajv |
| `ChartEngine.validate(spec)` / `VisualEngine.validate` | `validationContract.validate` from the manifest; runtime via installed `@knowledgeassemble/<engine>-engine` |
| `docs/fixtures/<engine>/skill-example.json` | `./example.json` |
| references to `docs/schemas/interactive-engine.schema.json`, `composition.schema.json` | `./schema.json` (envelope) / composition example round-trip |

Rules:
- SKILL.md remains **prose-first**; consumers load it into agent context verbatim. The published copy is generated from the in-repo doc so the two cannot drift — the repo doc stays the source, the package copy is a generated view (CI freshness guard: regeneration produces no diff).
- Every published example must round-trip ajv against its schema.json in the **installed** package (consumers validate with the tarball, not the workspace — mirrors P7 `publish:smoke` discipline).
- `visual` and `chart` get a first canonical `skill-example.json` extracted from their SKILL.md full-envelope examples (`example-nl` in educational-visual; `rainfall-monthly` in quantitative-chart) and checked in — closing the gap that these two currently lack a file fixture. The canonical example must round-trip validation exactly like the four existing fixtures.

## 5. Symmetric consumption on the OpenEdu side

### 5.1 External `openedu-course-authoring` skill

- New script `scripts/engine-skill-catalog.mjs` (mirrors `widget-catalog.mjs`, reads `openedu-adapter.mjs`): resolves `node_modules/@knowledgeassemble/engine-skills/manifest.json` from the detected repo, exposes `engines[]`, and loads a chosen engine's `SKILL.md` + `example.json` + `schema.json` into context.
- Repository-adapter discovery gains a capability flag `engineSkillsCatalog: boolean` (like `widgetCatalog`); when false, portable mode instructs the agent to `pnpm add @knowledgeassemble/engine-skills`.
- New `references/interactive-authoring.md` — "when to emit `{type:"interactive", engine, spec}` vs a legacy `widget` activity; load the engine's skill, follow its rules, round-trip against its schema, then hand the spec to the lesson node". Authoring rules stay in the engine skill; the reference only routes to it.

### 5.2 Studio companion (dev-server agent loop)

- The published manifest is read at server start; the dev-server registers one `@open-edu/companion` `CompanionSkill` per engine (or a single `interactive-authoring` skill), translating:
  - `skillDoc` → `instructions` (markdown loaded verbatim),
  - `schema` → draft-validation input (ajv + the `InteractiveLesson` envelope),
  - `example` → few-shot exemplar in the prompt layer.
- Registered via the existing `InMemorySkillRegistry` + `createSkillResolver` (`apps/dev-server/src/studio/ai/`); no companion contract change needed.

### 5.3 `@open-edu/domain-guidance` (ADR-0009 block)

- Add an "engine skills" block whose **authoritative owner is `@knowledgeassemble/engine-skills`**. `domain-guidance` derives a structured authoring view (engine→kind matrix, schema refs, validation contract, example refs) from the published `manifest.json`; it never re-declares engine knowledge.
- Prose (SKILL.md) is loaded from the package, not re-derived.
- CI freshness guard: regeneration against the installed `engine-skills` version yields no diff; version pinned to the workspace dependency.

## 6. Testing & gates

| Gate | Where | Assertion |
|------|-------|-----------|
| Example ↔ schema round-trip | `packages/engine-skills/test/` | every `skills/*/example.json` validates ajv against its `schema.json`; composition example additionally round-trips embedded-L1 |
| Manifest ↔ engine enums | `packages/engine-skills/test/` | `manifest.engines[*].kinds` equals the kind constants from each engine package (import from published source) |
| Skill-doc freshness | CI script | regenerating published SKILL.md copies from `docs/engines/*/skills/*/SKILL.md` produces no diff |
| Installed-package smoke | `scripts/` + `publish:smoke` | a temp consumer installs the tarball, ajv-validates each `example.json` against the **installed** `schema.json`, reads `manifest.json` via exports |
| Cross-repo shared fixtures | OpenEdu (open item) | `openedu-course-authoring`'s `engine-skill-catalog.mjs` and companion resolver run the same manifest fixtures and agree |

Full exit gate (in-repo): `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`, plus `pnpm publish:dry`.

## 7. Open questions carried to OpenEdu (not in-repo work)

1. Exact measure of `domain-guidance` ingestion (structured view vs. pointer to manifest) — decide in OpenEdu, ADR-0009 sequencing.
2. Whether the Studio companion registers six `CompanionSkill`s or one — OpenEdu product call.
3. How the course spec models interactive activities today vs `{type:"interactive"}` lesson nodes — depends on p7-acceptance item #2 (schema adoption), not on this package.

## 8. Alternatives considered

- **Ship schemas + examples only** (per-engine subpath exports) — prose still duplicated in OpenEdu; rejected.
- **Data-only catalog, no prose** — loses the substance of a skill; rejected as primary.
- **Git submodule / workspace reference** — couples monorepos, violates D2; rejected.
- **Companion-only, no external skill** — misses the broader authoring surface; rejected.