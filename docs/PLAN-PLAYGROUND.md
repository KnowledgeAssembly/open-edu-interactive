# Playground — Developer UI: Detailed Implementation Plan

**File:** `docs/PLAN-PLAYGROUND.md`
**Status:** Proposed (tooling phase; expands `docs/PLAN.md` §3 `apps/playground` and `docs/STRUCTURE.md` §35)
**Audience:** An AI coding agent or engineer implementing the playground
**Do this first:** read, in order — `docs/DESIGN.md` (§11, §16 D6, §18), `docs/STRUCTURE.md` (§35 Playground, §36 Testing), `docs/DEVELOPER-GUIDE.md` (§1 repo layout, §2 core loop), `docs/PLAN.md` (§3 `apps/playground`, §9 open item 3), `apps/conformance/src/main.ts` (current harness routes and `window.__harness` shape). These are normative; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Ship a **thin developer playground** (`apps/playground`) for manual engine and composition testing, separate from the Playwright-focused conformance harness (`apps/conformance`). The playground loads the **same fixture JSON** used by unit tests and golden snapshots, mounts engines through a **stub `EngineHost`**, and exposes inspector panels (events, snapshot, validation, a11y). A shared library (`packages/dev-harness`) holds mount logic used by both playground and conformance so behavior stays aligned.

**Approach.** Combine:

1. **Split apps** — `conformance` = automation; `playground` = human dev UI (STRUCTURE §35).
2. **Fixture-driven story routes** — one URL per fixture (e.g. `/engine/visual/number-line`, `/lesson/narrative-timeline-visual`).

**Non-goals (hard). Do NOT:**

- Build a product Interactive Studio (DESIGN D6). Authoring of engine specifications belongs in **OpenEdu Course Creator Studio** and the `openedu-course-authoring` skill.
- Add course authoring, quiz scoring, hints, workflow, telemetry persistence, i18n product, PWA, or `.oep` publishing.
- Add visual/coordinate authoring in the UI. JSON in, render out — no SVG/coordinate editors.
- Add runtime dependencies inside engine packages. New deps stay in `dev-harness`, `playground`, and build scripts only.
- Replace OpenEdu as the integration acceptance surface (`docs/p7-acceptance.md` remains the host-faithful checklist).
- Break existing Playwright e2e against `apps/conformance`. Harness refactor must be behavior-preserving.

**Non-negotiables (carried from platform contract).**

- D5 semantic actions only in specs and dispatch; renderer input (`click`, `pointer.*`) never appears in specs.
- Shared §67 error codes only (`INVALID_SPEC`, `INVALID_ACTION`, …).
- Event-only mutation; event log is serializable and replayable (P4).
- `additionalProperties: false` on schemas; validation surfaces real L1–L4 issues.
- Engine isolation (D2): `dev-harness` may import all engines; engines must not import each other.

---

## 1. Foundation: branch, conventions, current state

### 1.1 Branch strategy

```text
git switch main && git pull
git switch -c feat/playground
```

Commit per phase with repo style (e.g. `Playground T1: add fixture catalog script and dev-harness stub host`).

### 1.2 Grounded current state

| Asset | Location | Role |
|---|---|---|
| Conformance harness | `apps/conformance/` | Vite app, port 5173; `?engine=` routes; `window.__harness` for Playwright |
| Per-engine mounts | `apps/conformance/src/{chart,geomap,timeline,diagram,lesson,composition,visual}.ts` | Inline specs + mount logic to extract into `dev-harness` |
| React lesson mount | `packages/interactive-react/src/InteractiveLesson.tsx` | Composed lessons; playground uses this for lesson routes |
| Engine golden fixtures | `packages/{engine}-engine/fixture/{slug}/input.{type}.json` | Canonical per-engine specs |
| Composition fixtures | `docs/fixtures/composition/*.json` | Lesson-level multi-engine specs |
| P7 fixtures | `docs/fixtures/p7/composed-lesson.json`, `docs/fixtures/p7/widget-compat/*.json` | Integration examples |
| Playground | `apps/playground` | Dev UI on port 5174 (`pnpm playground`); fixture story routes + inspector panels |
| CLI (deferred) | `apps/cli` | Out of scope for this plan |

### 1.3 Ports and scripts

| App | Port | Root script |
|---|---|---|
| `apps/conformance` | 5173 | `pnpm playwright` (starts conformance dev server) |
| `apps/playground` | 5174 | `pnpm playground` (to add) |

Both apps may run simultaneously on different ports.

---

## 2. Target architecture

```text
packages/dev-harness/          # shared mount + stub host + fixture catalog
  generated/
    fixture-catalog.json       # build-time manifest
  src/
    stub-host.ts
    engine-registry.ts
    mount-engine.ts
    mount-lesson.ts
    harness-api.ts
    render-snapshot.ts
    validate-spec.ts
    index.ts

apps/playground/               # human dev UI (port 5174)
  src/
    main.tsx
    App.tsx
    routes/
    pages/
      HomePage.tsx
      EngineStoryPage.tsx
      LessonStoryPage.tsx
      CustomSpecPage.tsx
    panels/
      PreviewPanel.tsx
      EventsPanel.tsx
      SnapshotPanel.tsx
      ValidationPanel.tsx
      A11yPanel.tsx
      ActionsPanel.tsx
      HostPanel.tsx

apps/conformance/              # refactored to delegate to dev-harness (Phase 6)
  src/
    main.ts                    # thin ?engine= router
```

```text
Fixture sources
  packages/*-engine/fixture/**/input.*.json
  docs/fixtures/**/*.json
        │
        ▼
  scripts/build-fixture-catalog.mjs
        │
        ▼
  packages/dev-harness/generated/fixture-catalog.json
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
  apps/playground    apps/conformance    dev-harness tests
```

---

## 3. Phased tasks

### Phase 0 — Spec and scaffolding (½ day)

| ID | Task | Output |
|---|---|---|
| P0-T1 | This document | `docs/PLAN-PLAYGROUND.md` |
| P0-T2 | Scaffold `packages/dev-harness` | `package.json`, `tsconfig.json`, empty `src/index.ts` |
| P0-T3 | Scaffold `apps/playground` | Vite + React 19, port 5174, `strictPort` |
| P0-T4 | Root script | `"playground": "pnpm --filter @knowledgeassemble/playground dev"` |
| P0-T5 | STRUCTURE bookkeeping | §35 Playground status → in progress (not deferred) |

**Exit:** `pnpm typecheck` green with empty stubs.

---

### Phase 1 — Fixture catalog (1 day)

**Problem.** Fixtures live in multiple paths with inconsistent input filenames:

| Source | Pattern |
|---|---|
| Engine goldens | `packages/{engine}-engine/fixture/{slug}/input.{visual\|chart\|geomap\|timeline\|diagram}.json` |
| Composition | `docs/fixtures/composition/*.json` |
| P7 | `docs/fixtures/p7/composed-lesson.json`, `docs/fixtures/p7/widget-compat/*.json` |
| React golden | `packages/interactive-react/fixture/composed-lesson.golden.json` |

| ID | Task | Detail |
|---|---|---|
| P1-T1 | Catalog builder | `scripts/build-fixture-catalog.mjs` walks engine `fixture/` dirs and `docs/fixtures/` |
| P1-T2 | Generated manifest | `packages/dev-harness/generated/fixture-catalog.json` |
| P1-T3 | Root script | `"build:fixtures": "node scripts/build-fixture-catalog.mjs"`; hook into playground `dev`/`build` pre-step |
| P1-T4 | Catalog test | Unit test: every dir with `input.*.json` under engine `fixture/` appears in catalog |

**Catalog entry shape:**

```typescript
interface FixtureEntry {
  id: string;              // e.g. "visual/number-line"
  kind: 'engine' | 'lesson' | 'composition';
  engine?: EngineType;     // when kind === 'engine'
  slug: string;            // e.g. "number-line"
  specPath: string;        // repo-relative path
  golden?: {
    svg?: string;
    scene?: string;
    a11y?: string;
    alternative?: string;
    validation?: string;
  };
  title?: string;          // from spec.metadata.title when present
}
```

**Exit:** Catalog lists all engine golden fixtures plus composition and P7 lesson fixtures.

---

### Phase 2 — `packages/dev-harness` core (2 days)

Extract duplicated logic from `apps/conformance/src/*.ts`.

#### P2-T1 — Stub host

```typescript
// packages/dev-harness/src/stub-host.ts
export interface StubHostOptions {
  locale?: string;
  tokens?: Record<string, string>;
  reducedMotion?: boolean;
  onEvent?: (event: EngineEvent) => void;
  onAnnounce?: (message: string) => void;
}

export function createStubHost(opts?: StubHostOptions): {
  host: EngineHost;
  bridge: OpenEduBridge;
  events: () => readonly EngineEvent[];
  clearEvents: () => void;
};
```

- `t(key)` → passthrough (no i18n product).
- `resolveAsset` → identity.
- Event buffer capped at 200 (match conformance today).

#### P2-T2 — Engine registry

```typescript
export function createDefaultRegistry(): EngineRegistry;
```

Registers all five engines (same set as `InteractiveLesson`).

#### P2-T3 — Single-engine mount

```typescript
export interface EngineMountResult {
  instanceId: string;
  dispatch(action: EngineAction): void;
  snapshot(): unknown;
  events(): readonly EngineEvent[];
  validate(spec: unknown): ValidationResult;
  teardown(): void;
  renderTargets: RenderTarget[];
}

export function mountEngine(
  spec: EngineSpec,
  container: HTMLElement,
  opts?: { host?: StubHostOptions; instanceId?: string }
): EngineMountResult;
```

**Render rules** (mirror conformance per engine):

- Visual / Chart / GeoMap / Timeline / Diagram → inject `snapshot.svgResult.svg` into a `data-oedu-root` div.
- Chart / GeoMap / Diagram → render `tabular` / `alternative` as accessible `<table>` when present.
- Re-render on every `dispatch` (deterministic; no animation timers in harness).

#### P2-T4 — Lesson mount (vanilla DOM)

```typescript
export function mountLesson(
  lesson: unknown,
  container: HTMLElement,
  opts?: { host?: StubHostOptions }
): {
  dispatch(instanceId: string, action: EngineAction): void;
  snapshot(instanceId: string): unknown;
  events(): readonly EngineEvent[];
  instances(): string[];
  teardown(): void;
};
```

React lesson routes in playground use `InteractiveLesson` + `createStubHost().bridge` instead.

#### P2-T5 — Harness API factory (Playwright)

```typescript
export function exposeHarness(
  window: Window,
  mount: EngineMountResult | LessonMountResult,
  extras?: Record<string, unknown>
): void;
```

Sets `window.__harness`. Keep engine-specific aliases (`__chartHarness`, etc.) only if existing e2e tests require them; prefer consolidating on `__harness`.

#### P2-T6 — Validation helper

```typescript
export function validateSpec(spec: unknown, engineType: EngineType): ValidationResult;
```

Delegates to the correct `Engine.validate()` — surfaces L1–L4 issues with shared `ERROR_CODES`.

**Exit:** Vitest tests for stub host, `mountEngine` on `visual/number-line`, `mountLesson` on `docs/fixtures/composition/narrative-timeline-visual.json`.

---

### Phase 3 — `apps/playground` shell and story routes (2 days)

#### Routing

| Route | Page | Loads |
|---|---|---|
| `/` | Home | Catalog grouped by engine + lessons |
| `/engine/:engine/:slug` | EngineStory | e.g. `/engine/visual/number-line` |
| `/lesson/:slug` | LessonStory | e.g. `/lesson/narrative-timeline-visual` |
| `/custom` | CustomSpec | Paste JSON; auto-detect or pick `spec.type` |

Use `react-router-dom` for panel and route state.

#### Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Playground   [Home] [Custom]     Host: locale tokens ▾  │
├──────────────────────┬──────────────────────────────────┤
│                      │  [Preview] [Events] [Snapshot]    │
│   Render surface     │  [Validation] [A11y] [Golden?]   │
│                      │                                   │
└──────────────────────┴──────────────────────────────────┘
```

| ID | Task | Detail |
|---|---|---|
| P3-T1 | App shell + router | Layout with sidebar inspector tabs |
| P3-T2 | Home page | Read catalog; sections per engine + lessons; search by slug/title |
| P3-T3 | Engine story page | Resolve catalog entry; load spec via `import.meta.glob`; `mountEngine` |
| P3-T4 | Lesson story page | `InteractiveLesson` + stub bridge; inspector wired via ref handle |
| P3-T5 | Spec loading | Vite glob over `packages/*/fixture/**/input.*.json` and `docs/fixtures/**/*.json` |

**Exit:** `pnpm playground` → browse fixtures; rendered SVG for all five engines; at least one composed lesson route.

---

### Phase 4 — Inspector panels (2 days)

| Panel | MVP behavior |
|---|---|
| **Preview** | Render surface; optional "open SVG in new tab" |
| **Events** | Append-only list (`seq`, `name`, `action`); clear; copy as JSON |
| **Snapshot** | Pretty-printed `snapshot()`; collapsible JSON |
| **Validation** | `validateSpec` on load and on custom edit; issues by layer/code |
| **A11y** | `a11yTreeOf(snapshot)` from core; tree view |
| **Actions** | Buttons from `spec.interaction.actions`; prompt for `target.id` when needed |
| **Host** | `locale`, `reducedMotion`, token presets (`default` / `high-contrast` / `low-stimulation`); remount on change |
| **Golden** (optional) | If catalog has `golden.svg`, read-only side-by-side or string diff |

| ID | Task | Priority |
|---|---|---|
| P4-T1 | Events + Snapshot | Required |
| P4-T2 | Validation + Actions | Required |
| P4-T3 | A11y + Host remount | Required |
| P4-T4 | Golden diff | Optional; defer if timeboxed |

**Exit:** Load fixture → dispatch `select`/`focus` → events and snapshot update in UI.

---

### Phase 5 — Custom spec route (1 day)

| ID | Task | Detail |
|---|---|---|
| P5-T1 | JSON editor | Textarea for MVP (Monaco deferred) |
| P5-T2 | Validate before mount | Show `INVALID_SPEC` and other shared codes inline |
| P5-T3 | Draft persistence | `localStorage` key `playground:custom-spec` |
| P5-T4 | Share via URL hash | Optional: base64-encoded spec in `#` |

**Exit:** Invalid paste → validation errors; valid paste → renders.

---

### Phase 6 — Refactor conformance (1–2 days)

| ID | Task | Detail |
|---|---|---|
| P6-T1 | Replace inline specs | Load from fixture catalog paths |
| P6-T2 | Delegate mounts | Each `?engine=` route calls `dev-harness` + `exposeHarness` |
| P6-T3 | Keep `?engine=core` | P1 platform-only route unchanged |
| P6-T4 | Full gate | `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright` |

**Exit:** Zero Playwright regressions; `apps/conformance/src/main.ts` and per-engine files shrink substantially.

---

### Phase 7 — Docs and CI (½ day)

| ID | Task | Detail |
|---|---|---|
| P7-T1 | DEVELOPER-GUIDE | § "Local playground": `pnpm playground`, routes, D6 limits |
| P7-T2 | AGENTS.md | Point agents at playground for manual verification |
| P7-T3 | CI | `pnpm --filter @knowledgeassemble/playground typecheck` in workspace typecheck |
| P7-T4 | PLAN.md changelog | Record playground tooling phase completion |

**Exit:** Docs accurate; full gate green.

---

## 4. Package sketches

### `packages/dev-harness/package.json`

```json
{
  "name": "@knowledgeassemble/dev-harness",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./catalog": "./generated/fixture-catalog.json"
  },
  "dependencies": {
    "@knowledgeassemble/interactive-engine": "workspace:*",
    "@knowledgeassemble/visual-engine": "workspace:*",
    "@knowledgeassemble/chart-engine": "workspace:*",
    "@knowledgeassemble/geomap-engine": "workspace:*",
    "@knowledgeassemble/timeline-engine": "workspace:*",
    "@knowledgeassemble/diagram-engine": "workspace:*",
    "@knowledgeassemble/interactive-react": "workspace:*"
  },
  "scripts": {
    "build": "node ../../scripts/build-fixture-catalog.mjs && tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

### `apps/playground/package.json`

```json
{
  "name": "@knowledgeassemble/playground",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @knowledgeassemble/dev-harness build && vite --port 5174 --strictPort",
    "build": "pnpm --filter @knowledgeassemble/dev-harness build && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@knowledgeassemble/dev-harness": "workspace:*",
    "@knowledgeassemble/interactive-react": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  }
}
```

---

## 5. Testing strategy

| Layer | What |
|---|---|
| **dev-harness unit** | Stub host, `mountEngine`, `mountLesson`, catalog completeness |
| **playground** | Typecheck in CI for MVP; optional later Playwright smoke on one story route |
| **conformance** | Existing e2e — regression guard for harness refactor |
| **Golden parity** | Playground golden panel is read-only compare; authoritative diffs stay in engine `golden.test.ts` |

---

## 6. Exit criteria (phase complete)

1. `pnpm playground` serves fixture index and all engine story routes.
2. At least one composed lesson route shows cross-engine event routing in the Events panel.
3. Custom route validates and mounts a pasted spec.
4. `packages/dev-harness` is used by both playground and conformance.
5. Full repo exit gate green: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
6. No D6 violations (no scoring, telemetry, or course authoring shell).
7. `DEVELOPER-GUIDE.md` playground section and this plan reflect shipped behavior.

---

## 7. Deferred (post-MVP)

| Item | Rationale |
|---|---|
| Pointer/keyboard → D5 in preview | Per-engine renderer input adapters; conformance is dispatch-only today |
| Monaco JSON editor | Textarea sufficient for MVP |
| `apps/cli` validate/serve | PLAN deferred tooling; can wrap `dev-harness` later |
| Playground Playwright suite | Conformance covers harness; add only if UI regresses |
| `apps/documentation` interactive demos | Separate app per STRUCTURE §35 |
| OpenEdu Studio preview pane | Host-faithful integration; `docs/p7-acceptance.md` |

---

## 8. First PR slice (recommended)

Keep the first PR small and reviewable:

1. `scripts/build-fixture-catalog.mjs` + generated catalog.
2. `packages/dev-harness` with `createStubHost` + `mountEngine` only (visual fixture).
3. `apps/playground` with Home + `/engine/visual/number-line` + Events/Snapshot panels.
4. No conformance refactor yet.

Subsequent PRs: remaining engines → lesson routes → full inspector → conformance migration.

---

## 9. Estimated effort

| Phase | Focus | Days |
|---|---|---|
| 0 | Scaffolding | 0.5 |
| 1 | Fixture catalog | 1 |
| 2 | dev-harness core | 2 |
| 3 | Playground routes | 2 |
| 4 | Inspector panels | 2 |
| 5 | Custom spec route | 1 |
| 6 | Conformance refactor | 1–2 |
| 7 | Docs and CI | 0.5 |

**Total:** ~5–7 dev days for one engineer. Golden diff (P4-T4) and pointer input are the main stretch items.

---

## 10. Change log

| Date | Change |
|---|---|
| 2026-09-08 | Initial plan: split `apps/playground` from conformance, shared `packages/dev-harness`, fixture-driven story routes. |
| 2026-09-09 | Phases 2–5 shipped: dev-harness core, playground shell/routes, inspector panels, draft persistence, URL hash sharing. |
| 2026-09-09 | Phases 6–7 shipped: conformance refactored to delegate to dev-harness, DEVELOPER-GUIDE playground section, AGENTS.md updated, CI includes playground typecheck. |
| 2026-09-09 | Docs follow-up: SYSTEM-ARCHITECTURE §9 (dev tooling), DEVELOPER-GUIDE §9 expanded, STRUCTURE §35 (dev-harness, conformance, playground). |
