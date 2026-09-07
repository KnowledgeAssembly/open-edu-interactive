# Phase 7 — OpenEdu Integration: Detailed Implementation Plan

**File:** `docs/PLAN-P7.md`
**Status:** Detailed task breakdown for the P7 phase (supersedes nothing; expands `docs/PLAN.md` §4 P7)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P7
**Do this first:** read, in order — `docs/DESIGN.md` (§1, §6, §8, §12.1, §13, §14, §15 D6, §16 entire decision register including the Governance note), `docs/INTERACTIVE-ENGINE-SPEC.md` (§7.4 D5 actions, §82, §90 namespace, §94 envelope/lesson node, §95 widget compatibility), `docs/STRUCTURE.md` (§7 naming, §40–41 tree-shaking/publishing), `docs/PLAN.md` (§4 P7 scope + exit criteria, §9.1/§9.2 gates, §10 status board), `docs/PLAN-P2.5.md` (the Lesson model and binding conventions you host), `docs/PLAN-P5.md`/`docs/PLAN-P6.md` (engine result-event contracts you carry into a lesson). These are normative or load-bearing references; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Make OpenEdu able to **host** the engine family through `EngineHost` (D6) as `{ "type": "interactive", "engine", "spec" }` lesson nodes (PLAN.md §4 P7): deliver the **`interactive-react`** React mount that holds the five engines and implements the host seam from OpenEdu theme/i18n/a11y/telemetry inputs, produce the **lesson-node proposal schema** for adoption into `@open-edu/schemas`, add a **widget-compatibility mapping** that keeps `math.number-line` and friends running (progressive migration, §95), re-record **D1–D9 as ADRs** per `openedu-way/ADR.md`, and prove **cross-engine composition is hostable** in-repo via a lesson simulation — all WITHOUT importing any `@open-edu/*` package from this repo (D2/D6 contract boundary: **OpenEdu consumes us; we never import OpenEdu**).

Composition itself is NOT new here — it is proven at P2.5 (D8) via `Lesson`/`Router`; P7 extends hosting and authoring, not first composition (PLAN.md §4 P7 goal).

**Non-goals (hard). Do NOT:**
- Import any `@open-edu/*` package anywhere in this repo — even in `interactive-react` (D2/D6 §6). OpenEdu seams arrive as **props/bridge**; the mount implements `EngineHost` against them.
- Build a second OpenEdu: no telemetry store, i18n catalog/tooling, Course Creator Studio, scoring engine, or PWA in this repo (D6 + PLAN.md §6 "Interactive Studio **Out**"). `interactive-react` wires host services **through** the seam; it does not reimplement them.
- Rename packages to `@open-edu/*` unless the §9.2 gate resolution (T0) directs a monorepo move — D2 default is standalone `@knowledgeassemble/*`, with any rename in the **consuming** OpenEdu repo.
- Duplicate the composition runtime. Lesson hosting reuses core `Lesson`/`Router` (`src/composition/*`); no shadow runtime in `interactive-react`.
- Modify engine schemas, action sets, result-event names, or the P2.5 frozen composition fixture to "integrate". Widget compat is **data + mapping**, never silent broadening of engine `kind`s.
- Hand-write renderer markup or coordinates in any new artifact. `interactive-react` mounts the SVG/alternatives the engines already emit; it never re-implements rendering (raw-artifact anti-pattern).
- Add DOM/React to any engine package. React lives in `packages/interactive-react` and the conformance harness only (DESIGN §8, PLAN.md §6 "React only at the integration layer (P7, `interactive-react`)").
- Solve `openedu-way/ADR.md` numbering/lifecycle *on OpenEdu's behalf* here. This repo **drafts** ADRs 1–9 in `docs/adr/`; transplant into `openedu-way` is a cross-repo acceptance item (§7).
- Invent OEP/asset, token, locale, or telemetry session shapes. `resolveAsset → .oep`, tokens → design-system, locale → i18n, `onEvent` → telemetry are **contracts consumed**, defined by the seam interface and validated as types — nothing is hard-coded or fabricated at runtime.

**Non-negotiables (carried from P1–P6, extended for P7).**
- Shared §67 error codes only; `interactive-react` surfaces `EngineError`s, never swallows them.
- D5 semantic actions only — specs and lesson bindings never mention `click`/`pointer.*`.
- Event-only mutation through core `EventLog`/`baseReducer`; the emitted sequence stays serializable, replayable, deterministic (P4).
- Semantic-first: the AI-authored spec is the artifact; renderer/geometry is compiled output (P1/P2).
- No `additionalProperties` looseness: the lesson-node proposal schema keeps `additionalProperties:false`; adoption into `@open-edu/schemas` must preserve it.
- All user-facing strings localizable through the host `t()`; nothing hard-coded (P12).
- Determinism everywhere; no wall-clock, `Math.random`, or timers in the mount or fixtures.
- Shared conformance suite stays the definition of "done" — now asserted **on the installed packages** (criterion 2).

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P6 must be landed and its gate green

P7 is the final gate; it MUST NOT execute until P6 is DONE and its §4 gate is green (PLAN.md §2 "phases are promoted one at a time"). Before any P7 work:

1. `main` posts the P6 merge (all five engines landed: `visual-engine`, `chart-engine`, `geomap-engine`, `timeline-engine`, `diagram-engine`); full gate green on `main`:
   `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
2. `docs/PLAN.md` §10 shows P6 `DONE`; §11 has the P6 lines + Diagram-D1…Diagram-D5 (verified — do not re-do).
3. Resolve open gate **PLAN.md §9.2** ("integrate into the OpenEdu monorepo, or publish and consume as external packages?") at T0 and record it in §11 (see OpenEdu-D2).
4. Confirm the P7 host surface exists and is unchanged: core `index.ts` exports `EngineRegistry`, `Engine`, `EngineType` (five values), `EngineHost`, `EventLog`, `baseReducer`, `createPlatformInstance`, `Lesson`, `Router`, `LessonSchema`, `ENGINE_TYPES`, `NAMESPACED_EVENT_PATTERN`, `a11yTreeOf`, `runPipeline`, `validateEnvelope`, `EngineError`/`ERROR_CODES` (verified in the P7 file listing, §1.3). POST-P6 note: `ActionType` **does not** include a Lesson-level "submit" — lesson-level completion stays a host concern (D6).
5. Confirm the P2.5 frozen contract is intact: `docs/fixtures/composition/narrative-timeline-visual.json` + `packages/interactive-engine/test/fixtures/composition/narrative-timeline-visual.golden.json` are byte-stable and green.

If anything above is red, stop and fix it first.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p7-openedu-integration
```

Commit per task with repo style (`P7 T<nn>: <one-liner>`). Open a PR against `main`; land with `gh pr merge <n> --merge --delete-branch`. `main` is PR-protected — no direct pushes.

### 1.3 Grounded current state (verify on disk before writing code)

| Asset | Location | Status |
|---|---|---|
| Core public surface | `packages/interactive-engine/src/index.ts` | `EngineRegistry`, `Engine`/`EngineType` (5 values), `EngineHost`, `EventLog`, `baseReducer`, `createPlatformInstance`, `Lesson`/`LessonRuntime`, `Router`, `LessonSchema`/`ENGINE_TYPES`/`NAMESPACED_EVENT_PATTERN`, `a11yTreeOf`, `runPipeline`, `validateEnvelope`, `ERROR_CODES` — the only imports `interactive-react` may use |
| Composition runtime | `packages/interactive-engine/src/composition/{lesson,router,schema}.ts` | `Lesson` hosts N engines + bindings; `Router` maps namespaced events → engine actions — reused as-is |
| Engine packages | `packages/{visual,chart,geomap,timeline,diagram}-engine` | five engines, each publishing `src/index.ts` (public surface), `fixture/`, `e2e/`; deps = `interactive-engine` + `zod` only |
| Conformance app | `apps/conformance/src/main.ts` + `{visual,composition,chart,geomap,timeline,diagram}.ts` | `?engine=core|visual|composition|chart|geomap|timeline|diagram` with `__<name>Harness`; P7 adds `?engine=lesson` (host simulation) but reuses the others as-is |
| Frozen composition contract | `docs/fixtures/composition/narrative-timeline-visual.json` + golden log | byte-stable; used by T3/T5 as the lesson nucleus |
| Widget compatibility | `docs/INTERACTIVE-ENGINE-SPEC.md` §95 (and DESIGN §14 for scope) | mapping data authored at T4 — never engine-schema change |
| ADR target convention | `openedu-way/ADR.md` (OpenEdu monorepo) | sequential numbering, lifecycle, supersede rules; this repo **drafts** and DESIGN §16 links (Governance note) |
| DECISION REGISTER (to ADR-ify) | `docs/DESIGN.md` §16 | D1–D9: envelope node, package/namespace, platform-first, `purpose`, D5 actions, OpenEdu host seam, assessment seam, composition-at-P2.5, Visual closed component set |

### 1.4 Decision gates to close at T0 (record in `docs/PLAN.md` §11 change log before implementing)

- **OpenEdu-D1 — `interactive-react` is built here, seam-only, React isolated.** `packages/interactive-react` is the single framework-dependent package (DESIGN §8, §6 DoD "React only at the integration layer"). It is a **thin React mount**: props = `{ spec, engine?, host: OpenEduBridge }`; it registers the engine from the `engine` prop on demand (lazy — never a full five-engine registry import), instantiates the target engine, and wires **OpenEduBridge → `EngineHost`** (tokens → design-system, `locale`/`t()` → OpenEdu i18n, `reducedMotion`/`announce` → a11y session, `onEvent` → telemetry, `resolveAsset` → `.oep`), plus renders the engines' own SVG/alternatives and a11y tree. It MUST NOT import `@open-edu/*` (D6 boundary — the bridge is passed IN). `react`/`react-dom` are **peerDependencies**; `interactive-react` is published as `@knowledgeassemble/interactive-react` (D2).
- **OpenEdu-D2 — §9.2 gate resolution: publish-and-consume external packages.** Default decision (matches the P0→P1 resolution recorded in PLAN.md §9.1): stay standalone `@knowledgeassemble/*`, publish all six packages, and let OpenEdu install them as external dependencies. The `@open-edu/*` rename and any monorepo move happen **in the consuming OpenEdu repo** (D2 "namespace follows the host"), never speculatively here. Re-check with maintainers at T0; if they direct a monorepo move instead, OpenEdu-D2 changes the plan materially — stop and re-plan before proceeding.
- **OpenEdu-D3 — Lesson-node proposal schema (single source = shared contract).** Author `docs/schemas/interactive-lesson-node.schema.json` as the **proposal** OpenEdu adopts into `@open-edu/schemas`: `{ "type": "interactive", "engine": <ENGINE_TYPES>, "spec": <EngineSpec> }` per D1/§94, plus a lesson-level reuse of the P2.5 `Lesson` model (n engines + bindings). The proposal keeps `additionalProperties:false`; parity tests (T3, §5) hold it to the expressive range of the real engine envelope so adoption cannot invent a spec surface this repo can't serve.
- **OpenEdu-D4 — Widget compatibility is data + mapping, not schema change.** Author a mapping table (legacy widget node → interactive node) in `docs/fixtures/p7/widget-compat/` with round-trip conformance tests: `math.number-line` → `{ type:"interactive", engine:"visual", content.kind:"number-line" }`, and analogous entries for the other legacy widgets §95 names. `math.number-line` stays valid as a **parallel node type**; migration is **progressive** (PLAN.md §4 P7 item 4). No engine `kind`/schema edits for compat; no shim code in engines — the mapping lives at the OpenEdu ingestion layer, defined here as data + tests.
- **OpenEdu-D5 — ADR re-recording is drafting here, transplant is acceptance.** Per the DESIGN §16 Governance note, re-record **D1–D9 in `docs/adr/`** following `openedu-way/ADR.md` conventions (sequential numbering ADR-01…ADR-09, lifecycle headers — Proposed/Accepted/Superseded, supersede links), and append DESIGN §16 register links to them. A doc test (grep, T6) asserts every D1–D9 row links to its ADR. Physically moving the ADRs into `openedu-way` is a **cross-repo acceptance item** — this repo never commits into the OpenEdu monorepo.

---

## 2. The P7 integration contract (author these artifacts first)

### 2.1 The `OpenEduBridge` seam (type-only; no `@open-edu/*` import)

`interactive-react` cannot import OpenEdu, so the contract is a **structural interface** the host passes in:

```ts
// packages/interactive-react/src/bridge.ts
export interface OpenEduBridge {
  locale: string;                      // → EngineHost.locale
  tokens: Record<string, unknown>;     // → EngineHost.tokens (design-system)
  reducedMotion: boolean;              // → EngineHost.reducedMotion
  t(key: string, vars?: Record<string, string | number>): string; // → EngineHost.announce + engine text
  announce(message: string): void;     // → host a11y live region
  onEvent(event: EngineEvent): void;   // → OpenEdu telemetry session (never stored here)
  resolveAsset(ref: string): string | Uint8Array; // → .oep asset data (sync — matches EngineHost.resolveAsset)
}
```

`interactive-react` implements `EngineHost` (`src/core/host.ts:3`) from these props **in both directions**: it reads theme/locale/prefs INTO the engine and streams the engine's D5 event log OUT via `onEvent`. No shadow inventory of events is kept.

### 2.2 Lesson-node proposal shape

```jsonc
{
  "type": "interactive",                // fixed; what @open-edu/schemas will recognize
  "engine": "timeline",                 // ENGINE_TYPES member
  "spec": { "type": "timeline", "version": "1.0.0", "id": "narrative",
            "content": { "kind": "events", "events": [ … ] }, "sources": [ … ] }
}
```

A **composed lesson** reuses the P2.5 model verbatim (`LessonSchema`): an array of engine entries (each `{ engine, spec? }`) plus `bindings[]` mapping a namespaced event to a target action (e.g. `timeline.event-selected` → `focus` on the visual engine). The T3 fixture (`docs/fixtures/p7/composed-lesson.json`) nests the frozen `narrative-timeline-visual` contract inside an OpenEdu-shaped lesson so every engine in the composed lesson is a valid `{ type:"interactive" }` node.

### 2.3 Widget-compatibility mapping (T4)

| Legacy widget (stays valid, parallel) | Interactive node (progressive migration) |
|---|---|
| `core.timeline` | `{ engine:"timeline", spec.content.kind:"events" }` |
| `math.number-line` | `{ engine:"visual", spec.content.kind:"number-line" }` |
| `core.hotspot` | `{ engine:"visual", spec.content.kind:"hotspot" }` (if available) |
| `core.image-compare` | `{ engine:"visual", spec.content.kind:"image-compare" }` (if available) |
| `science.label-diagram` | **No mapping at P7** — requires image + anchor support not yet in Visual |
| `…` (other §95 widgets) | Per §95 analysis; record **"no mapping at P7"** where no faithful engine home exists |

Mapping entries are checked into `docs/fixtures/p7/widget-compat/*.json`; a test round-trips each mapping — the target node validates through `validateEnvelope` + the named engine's `validate`, and the legacy node remains a valid parallel node type (schema-level coexistence, not renderer coexistence).

P7 never widens engine `kind`s; if a legacy widget has no faithful engine home, the mapping row records **"no mapping at P7"** rather than stretching an engine (silent-broadening anti-pattern).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prereqs, decision-gating, §9.2 gate resolution, docs freeze
- Reconcile §1.1 (P6 landed; gate green). Branch per §1.2.
- Resolve PLAN.md §9.2 per OpenEdu-D2 with maintainers; record the resolution **and** OpenEdu-D1…OpenEdu-D5 in `docs/PLAN.md` §11 before implementing.
- Docs freeze: **do not** edit any engine `SPEC.md`/`VISION.md`, the shared `INTERACTIVE-ENGINE-SPEC.md`, the envelope schema, or the frozen composition fixture during P7 except the DESIGN §16 register-link append (T6). P7 adds documents; it does not amend the engine contract (OpenEdu-D4).

**Done when:** PLAN.md §11 has the §9.2 resolution + five OpenEdu-D decision lines; branch `feat/p7-openedu-integration` exists; `pnpm -w test` is green on the branch base.

### T1 — Packaging & publishability baseline (criterion 2, first half)
- Add publish readiness to **all six packages** (`interactive-engine` + five engines) and the root: `package.json` `files`, `exports` map (`"."` → types + ESM, no subpaths out of `src/index.ts`), `engines` field, per-package `prepublishOnly`/`test` wiring. Keep the **per-file `tsc` ESM emit, no bundler** convention (STRUCTURE §40–41: engine-level tree-shaking survives install).
- Add `pnpm -r publish --dry-run --no-git-checks` parity check: every package reports the same version, files, and exports shape; no accidental publishes.
- **Package smoke test** (`packages/interactive-react/test/package-smoke.test.ts` or a script under `scripts/`): create a temp consumer, `npm pack` each package, install them into it, import every public symbol from `src/index.ts`, and `tsc --noEmit` it — asserting the installed (not workspace-path) artifacts typecheck and resolve (this is the in-repo half of PLAN criterion 2: conformance on the **installed** packages comes at T7).

**Done when:** `pnpm -r publish --dry-run` is green and the temp-consumer smoke resolves + typechecks every exported symbol from the packed tarballs.

### T2 — `interactive-react` package (mount, bridge, a11y, alternatives)
- Scaffold `packages/interactive-react/` mirroring engine conventions (strict TS, `.js` specifiers, Vitest, no bundler, `react`/`react-dom` as **peerDeps**, deps = six `@knowledgeassemble/*` packages only):

```text
packages/interactive-react/
  package.json, tsconfig.json, vitest.config.ts, playwright.config.ts
  src/bridge.ts, src/host.ts, src/InteractiveLesson.tsx, src/InteractiveNode.tsx, src/index.ts
  test/bridge.test.ts, test/host.test.ts, test/mount.test.tsx, test/replay.test.ts
  e2e/lesson.spec.ts          # Playwright against the conformance `?engine=lesson` route (T5)
  fixture/                    # checked-in golden snapshots for mount/replay
```

- `InteractiveNode` (single engine) and `InteractiveLesson` (composed: core `Lesson` + `Router`): props `{ host: OpenEduBridge, node | engines+bindings }`. The mount registers the engine on demand from the `engine` prop (importing the needed engine's public surface via a small `engine → class` map), instantiates via the engine's own `validate`/`instantiate`, injects emitted SVG/alternatives/a11y tree into the DOM, and maps user activation (button/link/keyboard) → D5 actions off the engine's `interactive` map — **never** re-derives interaction semantics (no `click` in specs).
- Wire **OpenEduBridge → `EngineHost`** (§2.1); `announce` and `t()` feed host locale/prefs; `onEvent` receives every `EngineEvent` — the mount records nothing.
- jsdom unit tests: bridge mapping, mount of a visual number-line node, composed mount of the T3 fixture, replay determinism (events replay `seq`-monotonic via core `EventLog`).

**Done when (test-first):** `typecheck` + unit tests green; mount of a single number-line node emits the full lifecycle events through `onEvent` with correct tokens/locale from the bridge; composed mount drives both engines off one `Lesson`.

### T3 — Lesson-node proposal schema + parity guardrail + composed-lesson fixture
- Author `docs/schemas/interactive-lesson-node.schema.json` (canonical proposal, OpenEdu-D3): `{ type:"interactive", engine: <ENGINE_TYPES>, spec: <EngineSpec> }`, `additionalProperties:false` at every level, plus the composed `lesson` form reusing `LessonSchema` semantics.
- **Parity guardrail** (`packages/interactive-engine/test/p7/lesson-node-parity.test.ts`, see §5): for every `ENGINE_TYPES` member, a representative spec (taken from that engine's own golden fixtures) validates **inside** the node schema; and a node referencing an unknown engine, an `additionalProperties` infraction, or a spec outside the shared envelope fails.
- Author `docs/fixtures/p7/composed-lesson.json`: an OpenEdu-shaped lesson whose engine entries **reuse the frozen `narrative-timeline-visual` spec** verbatim and carry lesson-level bindings — proving the P2.5 contract lifts into `{ type:"interactive" }` nodes unchanged. Golden event log checked in as `packages/interactive-react/fixture/composed-lesson.golden.json`, matching the P2.5 golden sequence (byte-stable).

**Done when (test-first):** parity test green for all five engines; composed-lesson fixture round-trips `LessonSchema` + node-schema validation; golden log matches the frozen P2.5 sequence.

### T4 — Widget-compatibility mapping data + round-trip tests
- Author `docs/fixtures/p7/widget-compat/*.json` per §2.3 (legacy → interactive mapping rows, per §95 list), including explicit "no mapping at P7" rows where faithful.
- Round-trip test (`packages/interactive-react/test/widget-compat.test.ts`): every mapped interactive node validates (`validateEnvelope` + named engine `validate`); every legacy node stays valid in the legacy position (schema-level parallel coexistence).

**Done when (test-first):** all mapped rows green; a greedy row that would widen an engine `kind` (e.g. "visual timeline") fails the mapping schema rather than stretching the engine (silent-broadening guard).

### T5 — Host-simulation conformance route (`?engine=lesson`) + browser proof of criterion 1 (in-repo half)
- Add React `react`/`react-dom` as devDeps to `apps/conformance`; author `apps/conformance/src/lesson.ts` — a **host simulation** that mounts `InteractiveLesson` with a `OpenEduBridge` implementation (stub tokens/locale/`t`/announce/`onEvent`/`resolveAsset` reading from the harness) over `docs/fixtures/p7/composed-lesson.json`, renders each engine's SVG + relationship/number-line alternatives as accessible tables, exposes `window.__lessonHarness = { dispatch, snapshot, events, svg, alternative, tryCreate }`, and wires `?engine=lesson` in `apps/conformance/src/main.ts`.
- `e2e/lesson.spec.ts` (Playwright, runs against installed packages via the dev server):
  1. **cross-engine binding** — activating a timeline event dispatches `select`; snapshot shows the visual engine gains the bound focus (P2.5 `timeline.event-selected` → visual `focus`); the golden event log replays `seq`-monotonic.
  2. **host seam** — `onEvent` receives every `EngineEvent`; `reducedMotion` from the bridge reaches the engine; `locale`/`t()` drive rendered copy (assert a non-English locale string, no hard-coded English).
  3. **a11y** — each node renders `<title>`/`<desc>` + labeled alternatives; no color-only meaning; keyboard path does `focus` → `select` without pointer.
  4. **authoring proof** — `tryCreate` of an AI-authored node spec (the T3 parity representatives) validates and mounts in the same host, no renderer code.
- Optional (NOT a gate — PLAN.md §4 P7 item 6): extend `composed-lesson` with a Timeline + GeoMap narrative once P4 is in; if skipped, record the note in §11.

**Done when:** all four specs green in a real browser; the golden log for the composed lesson is byte-identical to the P2.5 fixture's sequence.

### T6 — ADR re-recording (D1–D9) + DESIGN §16 links + doc test
- Draft `docs/adr/ADR-01.md … ADR-09.md` for D1–D9 (DESIGN §16), following `openedu-way/ADR.md`: sequential numbering ADR-01…ADR-09, lifecycle headers (Proposed → Accepted → Superseded where DESIGN says "Supersedes …"), explicit status, and supersede links (e.g. ADR-02 packages/namespace supersedes Visual ARCHITECTURE §41–42). Each ADR maps 1:1 to its D-row and cites the DESIGN § number.
- Append the "ADR" link column/rows to the DESIGN §16 register (Governance note) — the only DESIGN.md edit in P7.
- **Doc test** (grep, e.g. `packages/interactive-engine/test/p7/adr.test.ts` reading `docs/adr/`): every D-row in DESIGN §16 resolves to an existing ADR file; every ADR has the sequential-number/lifecycle/supersede fields per `openedu-way` conventions.

**Done when (test-first):** doc test green; `git grep -c "Supersedes" docs/adr` ≥ the supersede citations in DESIGN §16; register links added.

### T7 — Installed-package conformance (criterion 2 complete) + README
- Run the **common conformance suite on installed packages**: in the temp consumer from T1, install all seven packages (`interactive-engine` + five engines + `interactive-react`), import each engine's public surface, and drive the same L1–L4 validation + result-event assertions the workspace tests assert — gate green on the tarballs, not just the workspace paths. (This is PLAN criterion 2: "all engines pass the common conformance suite on the installed packages.")
- Wire the conformance app so `?engine=lesson` loads components from the **installed** `interactive-react` (dev-time resolution switch documented), keeping the Playwright suite green on installed artifacts.
- Author `docs/README.md` additions — "Consuming from OpenEdu": install the packages, mount `InteractiveLesson` with an `OpenEduBridge`, adopt `interactive-lesson-node.schema.json` into `@open-edu/schemas`, wire host services (per PLAN.md §4 P7 items 2–3).

**Done when:** temp-consumer suite + conformance e2e green on installed packages; README section exists and its commands are the ones actually validated.

### T8 — Cross-repo acceptance list + PLAN reconciliation + full exit gate
- Author `docs/PLAN-P7.md`'s acceptance counterpart `docs/p7-acceptance.md`: the cross-repo acceptance items for the OpenEdu repo — adopt the lesson-node schema into `@open-edu/schemas`; host `interactive-react` in learner `CourseRuntime`; wire real token/i18n/telemetry/`.oep` services behind the bridge; enable Studio authoring of engine specs (PLAN.md §4 P7 item 5 — Studio extension is OpenEdu-side; in-repo evidence = each engine's skill + validated examples); transplant ADRs into `openedu-way`; run criterion 1's real-lesson verification. Each item names the in-repo artifact it consumes.
- `docs/PLAN.md` §10 status board `P7 → DONE` **only after** the §4 gate is green; §11 change-log lines for P7 DONE, the five OpenEdu-D decisions, and the §9.2 resolution.

**Done when:** full exit gate green (§4) on `main`; PLAN.md status board + change log consistent; acceptance list filed.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Then the §1.3 temp-consumer suite (T1/T7) on the **installed** packages. Map to `docs/PLAN.md` §4 P7 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Cross-engine composed lesson runs from an AI-authored spec, no renderer code | **PLAN.md exit 1 amended (2026-09-07):** the gate is the in-repo **host-simulation** e2e (T5 `?engine=lesson`) with an AI-authored node mounting in a real browser, golden `composed-lesson.json` + byte-stable golden event log reusing the P2.5 sequence. The **real learner-`CourseRuntime`** run is impossible in-repo by definition (no `@open-edu/*` here) — it is the first cross-repo acceptance item in `docs/p7-acceptance.md` (T8) |
| 2 | All engines pass the common conformance suite on the **installed** packages | T1 package smoke + T7 temp-consumer suite running the same L1–L4 + event-log assertions against the packed tarballs, plus conformance Playwright wired to installed `interactive-react` |
| 3 | ADRs recorded; DESIGN §16 register links to them | T6 `docs/adr/ADR-01…09` + register links + doc test |

**Self-checks (all MUST pass, not just the three PLAN criteria):**
- **No `@open-edu/*` import anywhere:** `grep -rn "@open-edu/" packages apps docs scripts` → empty (the word may appear in README/acceptance prose only, never in code). `grep -rn "@open-edu/" packages/*/src apps/conformance/src` MUST be empty.
- **Second-OpenEdu guard (D6):** `grep -rln "scoring\|telemetryStore\|i18n\|Studio\|PWA" packages/interactive-react/src` → only the bridge **type names** (`locale`, `onEvent`), never reimplementations; no stateful event stores in the mount.
- **No engine schema/event drift:** `git diff --stat` over `packages/*/src/schemas` and `docs/schemas/interactive-engine.schema.json` → empty at the end of P7; `docs/fixtures/composition/narrative-timeline-visual.json` + golden log still byte-stable (`git diff` empty).
- **React isolation:** `grep -rn "react" packages/*/package.json` → only `interactive-react` (as peerDeps) and conformance devDeps; `grep -rn "react" packages/interactive-engine packages/*-engine/src` → empty.
- **Tree-shaking preserved:** every package keeps `type: module`, per-file ESM emit, no `dist` bundling; `pnpm -r publish --dry-run` files/exports parity green.
- **Determinism:** `grep -rn "Date.now\|Math.random\|performance.now\|setTimeout" packages/interactive-react/src` → empty; replay/golden tests are two-run byte-identical.
- **Shared §67 codes:** `interactive-react` surfaces `EngineError`s verbatim; no bespoke codes in the mount.
- **Widget compat not schema loosening:** `grep -rn "kind" docs/fixtures/p7/widget-compat` rows only reference existing engine `kind`s; no new enum values.

---

## 5. Contract-parity guardrails (the P7 analogue of schema↔Zod parity)

1. **Lesson-node schema ↔ engine envelope.** Every `ENGINE_TYPES` member has a representative spec (from that engine's golden fixtures) that validates inside `interactive-lesson-node.schema.json`; a node with `engine` outside `ENGINE_TYPES`, extra keys, or a non-envelope spec fails. Asserted in `test/p7/lesson-node-parity.test.ts` (T3).
2. **Composition parity.** The composed-lesson fixture is validated by core `LessonSchema` AND by the node schema per engine entry, and its golden event log is byte-identical to the frozen P2.5 `narrative-timeline-visual.golden.json` sequence (T3/T5).
3. **Installed-vs-workspace parity.** The T1/T7 temp-consumer suite asserts the same assertions on the packed tarballs as the workspace tests — no workspace-only privileges (T1/T7).
4. **Widget-compat round-trip.** Every mapping row's target node validates + renders; legacy rows stay valid (T4).
5. **Host-seam parity.** The bridge → `EngineHost` mapping is asserted per-field (token shape, locale, `reducedMotion`, `announce`, `onEvent` event stream) in `test/host.test.ts` (T2).

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not ship a shadow runtime.** `interactive-react` hosts core `Lesson`/`Router`/`EventLog`; any bespoke event store or state machine is a D6 violation. Reuse, don't reimplement.
2. **`@open-edu/*` is forbidden in code here**, even behind the bridge. OpenEdu's shapes enter as props and leave as `EngineEvent`s; the repository boundary is non-negotiable (D2/§6).
3. **No second OpenEdu.** Telemetry, i18n catalogs, Course Creator Studio, scoring, and PWA are consumed through the bridge or named as acceptance items — never built. `questions`/completion stay hints; OpenEdu owns scoring (D7).
4. **React only in `interactive-react`.** Engine packages remain framework-independent per-file ESM; adding React/DOM to an engine is a contract violation — reject in review.
5. **Do not hand-write renderer markup.** Mount the engines' emitted SVG/alternatives/a11y tree; interaction comes from the engines' `interactive` maps. No coordinates/pixels at the integration surface.
6. **Do not edit the engine contract for integration.** Widget compat is mapping + parallel node types (OpenEdu-D4); silent kind widening, action-set additions, or event renames to "slot in" are reject candidates.
7. **No speculative `@open-edu/*` rename.** Namespace follows the host (D2); OpenEdu-D2 keeps `@knowledgeassemble/*` here. Unless the §9.2 resolution at T0 changes direction, stop and re-plan before renaming anything.
8. **Keep publishable quality (STRUCTURE §40–41).** Per-file ESM, exports maps, no bundler; the packing/`publish --dry-run` parity is part of the gate — an un-publishable package fails P7 even if tests pass on paths.
9. **Exact §67 codes, surfaced not swallowed.** `interactive-react` passes `EngineError`s to the host with their code intact; no bespoke error strings.
10. **Determinism and replay hold in the mount.** No timers/time/random in mount or fixtures; the golden event log replays `seq`-monotonic.
11. **Test-first.** Every task T1–T7 starts with its failing test/fixture; "done" means that test passes. The conformance suite runs against **installed** packages by T7 (criterion 2).
12. **`.js` specifiers + narrow public surface** in `interactive-react` (`src/index.ts`: `InteractiveNode`, `InteractiveLesson`, `OpenEduBridge`, types). Deep imports into any engine internals are forbidden (NodeNext).
13. **Cross-repo discipline.** Anything living in the OpenEdu monorepo (`@open-edu/schemas`, learner `CourseRuntime`, Studio authoring, `openedu-way` transplant) is an **acceptance item** — file it in `docs/p7-acceptance.md`, never attempt it from this repo.
14. **Freeze before integrating.** Do not amend SPEC/VISION/envelope/frozen composition fixtures during P7 (T0 freeze); if a gap surfaces, record it in PLAN.md §11 for the next phase rather than silently broadening the contract.

---

## 7. Definition of Done (P7-specific)

P7 is complete when:

- `docs/PLAN.md` §4 P7 exit criteria 1–3 are green per the §4 mapping, verified by the gate commands + temp-consumer suite (not assertion). Criterion 1's real-lesson verification is explicitly **filed as a cross-repo acceptance item**, with the in-repo host simulation as the shipped evidence.
- All seven packages (core + five engines + `interactive-react`) are publish-ready, and the common conformance suite is green on the **installed** tarballs (criterion 2).
- `interactive-react` mounts single and composed lessons from AI-authored specs via `OpenEduBridge → EngineHost`, emitting the full D5 event sequence to the host; browser e2e green.
- `docs/schemas/interactive-lesson-node.schema.json` proposal + parity guardrail green; `docs/fixtures/p7/composed-lesson.json` + golden log byte-stable and consistent with the frozen P2.5 sequence.
- Widget-compat mapping data + round-trip tests green; `math.number-line` remains valid as a parallel node type; no engine schema changed (`git diff` empty over schemas).
- `docs/adr/ADR-01…09` drafted per `openedu-way/ADR.md`; DESIGN §16 register links to them; doc test green (criterion 3).
- `docs/PLAN.md` marks P7 **DONE**, logs the five OpenEdu-D decisions + the §9.2 resolution, and `docs/p7-acceptance.md` lists the cross-repo items for OpenEdu.

P7 is the **final** phase (P0–P7). When the §4 gate is green, the engine family ships as a consumable product — no P8.