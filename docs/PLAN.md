# OpenEdu Interactive Engine — Implementation Plan

**File:** `docs/PLAN.md`
**Status:** Living (sequencing is maintained here, per DESIGN.md §14)
**Version:** 1.0.0
**Audience:** AI coding agents and engineers implementing the engines
**Scope:** When and who, in what order, and with what verification. DESIGN.md fixes *what and why*; this plan sequences *when and who*.

---

## 1. Purpose

This is the living sequencing document for building the interactive-engine package family from DESIGN.md D3 (**platform first, then engines**). Every phase is **exit-criteria gated**: a phase is promoted only when its full exit checklist is green, as verified by automated commands — not by assertion.

Source of truth for content: `DESIGN.md` → `INTERACTIVE-ENGINE-SPEC.md` → engine `SPEC.md`/`VISION.md` → Visual architecture docs. When a conflict is found, fix the higher document, not the implementation.

---

## 2. Working Model

- **Who.** The implementation is performed by AI coding agents. Agents author and edit **engine specifications (JSON)**; they do not hand-author renderer markup or coordinates (DESIGN P2).
- **Test-first.** Every task starts with its conformance test or fixture. No engine feature is "done" without a test that fails first (DESIGN §11, STRUCTURE §36-37).
- **Gates.** Each phase ends with a checkpoint review against the exit checklist below. Phases are promoted one at a time; the next phase does not start until the previous gate is green.
- **Commits.** Land a git commit per completed task/phase. History is the review trail.
- **Non-negotiables.** `additionalProperties:false`; shared error codes (§67); deterministic output; no engine-to-engine package imports (DESIGN §6); no arbitrary JS in specifications (§93).
- **Skills.** Agents SHOULD load the authoring/execution skills referenced in `DESIGN.md` §14 before starting an engine phase.

---

## 3. Repository and Packages

Repository: `KnowledgeAssembly/open-edu-interactive` (created, pushed — main).

Package layout per DESIGN D2 / shared contract §90:

```text
packages/
  interactive-engine/        core: engine.ts, state, action, event, registry, validation;
                             accessibility/ · composition/ · runtime/ · schemas/
  visual-engine/             src/ + schemas/visual-spec.schema.json
  geomap-engine/             src/ + schemas/geomap-spec.schema.json
  chart-engine/              src/ + schemas/chart-spec.schema.json
  timeline-engine/           src/ + schemas/timeline-spec.schema.json
  diagram-engine/            src/ + schemas/diagram-spec.schema.json
apps/
  playground/                per-engine dev environment (P2+)
  cli/                       generate·validate·preview·inspect·components·recipes (P2+)
```

Namespace: `@knowledgeassemble/*` while standalone; `@open-edu/*` when integrated into the OpenEdu monorepo (D2 — namespace follows host).

Technology (DESIGN §8, STRUCTURE §8-16):

- TypeScript (strict mode), pnpm workspaces, Vite tooling.
- JSON Schema — canonical public contract; Zod — runtime validation; TS types generated/derived from schemas.
- Vitest (unit/component/integration), Playwright (browser: keyboard, pointer, responsive, a11y, cross-engine).
- React only at the integration layer (P7, `interactive-react`). The core runtime stays framework-independent.

---

## 4. Program Phases

### P0 — Foundation and Consolidation — IN PROGRESS

**Goal.** Design stabilized, envelope canonical, decisions recorded, repo live.

**Completed**

- Full doc restructure; `DESIGN.md` (decisions D1-D3) and `README.md` written.
- D1-D3 recorded in DESIGN §16 decision register.
- Base envelope schema at `docs/schemas/interactive-engine.schema.json` (`type`/`version`/`id`, `additionalProperties:false`).
- Repo created and pushed to GitHub (`main`).

**Remaining**

- [x] Envelope `purpose` / `interaction` in DESIGN and this plan match `interactive-engine.schema.json` (D4). Engine-specific selectable targets live in `content`.
- [x] Replace the legacy envelope in engine docs and examples: GeoMap `geomap` wrapper (geomap SPEC §7) and Visual `schemaVersion` (visual SPEC §7) MUST NOT appear in new examples (D1).
- [ ] Code-first schema package lands here → moved to P1.1 (no code exists yet).

**Exit criteria (all green)**

1. `DESIGN.md` has no open conflicts with `INTERACTIVE-ENGINE-SPEC.md`.
2. No remaining legacy-envelope examples in `docs/engines/*`.
3. Docs commit is clean on `main`.

---

### P1 — Platform Skeleton (no engines yet)

**Goal.** Thin platform contract: envelope, registry, D5 reducer, host adapter stub, conformance — **with no engine and no duplicate OpenEdu products** (DESIGN D6).

**Scope (in order)**

1. **Workspace** — pnpm workspace, `tsconfig` strict, Vitest, Playwright, ESLint/Prettier, CI gate.
2. **Schema package** (`interactive-engine/schemas/`) — fold `interactive-engine.schema.json` in; Zod runtime validators derived; `additionalProperties:false` enforced; versioning rules (§38).
3. **Core** (`interactive-engine/core/`) — `engine.ts` interface, registry: `register → validate → instantiate → run → teardown` (§7.3).
4. **State + events** — event-only mutation, serializable/replayable log, read-only scene snapshot (§7.2).
5. **Interaction DSL** — D5 semantic action set in schema `$defs.actionType` (DESIGN §7.4). Renderer input is not part of the DSL.
6. **Host adapter** — `EngineHost` stub (locale, tokens, `reducedMotion`, `announce`, `onEvent`, `resolveAsset`). No OpenEdu package imports.
7. **Accessibility primitives** — roles/labels/ids derived for future renderers; consume host a11y prefs (DESIGN §12, D6).
8. **Conformance harness** — L1–L4 + Playwright replay using shared primitives only (no engine).

**Out of scope for P1 (owned by OpenEdu; do not build)**

- Telemetry storage / RxJS session product
- i18n catalogs and `LanguageSwitcher`
- Design-token source of truth / theme editor
- Quiz scoring, workflow, rewards
- Course Creator Studio or any “Interactive Studio” app
- Pipili, PWA, `.oep`, auth

**Deliverable.** `packages/interactive-engine` green; harness renders a minimal scene to DOM in Playwright without any engine package and without a second telemetry/i18n/theme stack.

**Exit criteria (all green)**
`pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`

1. Unknown keys rejected at L1 (`INVALID_SPEC`), not ignored (P11).
2. Events/state/interaction-DSL exercised through Playwright with a replay test.
3. A11y primitives validated (labels/roles present per §7/§12); host stub can set `reducedMotion`.
4. No engine package exists and none is required to pass the harness.
5. Repo contains no telemetry store, i18n product, Studio app, or scoring engine (D6).

---

### P2 — Visual Engine

**Goal.** First engine. Vertical slice: **number line** end-to-end (spec → schema → scene → layout → accessible SVG → fixtures), then the visual component library.

**Scope (in order)**

1. Author `schemas/visual-spec.schema.json` (from visual SPEC §7 semantics, migrated to envelope D1).
2. **Number-line vertical slice** (`engines/visual/PROJECT.md` §38-39) — restated in the shared envelope:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "purpose": {
    "learningObjective": "Estimate where a value sits between bounds",
    "interactionGoal": "Select the highlighted value on the number line",
    "reasoningMode": "estimate"
  },
  "content": {
    "kind": "number-line",
    "range": { "min": 0, "max": 10, "step": 1 },
    "highlight": [7],
    "selectable": ["highlight", "range"]
  },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "deselect", "focus", "reset"]
  },
  "questions": []
}
```

Expected semantic behavior: `0 ─ 1 ─ … ─ 10` with `7` highlighted and interactive. Visual design is implementation-dependent; semantic behavior is not (§39).

3. SVG renderer + deterministic output + renderer tests (PROJECT Phase 2).
4. Layout: horizontal/vertical/grid, alignment, labels, collision detection (Phase 3).
5. Component library — visual-only subset of Phase 4 (1-7): number line, counting set, fraction bar, fraction circle, clock, coordinate grid, geometry shape. Items 8-11 (timeline, label diagram, flowchart, comparison) belong to Timeline/Diagram engines and MUST NOT be re-implemented here (no engine smuggling, DESIGN §15).
6. Validator, host-theme consumption (default + high contrast + low stimulation **via EngineHost tokens**), agent skill `educational-visual/SKILL.md`, playground + CLI scaffold. Do not add a Studio app (D6).
7. Golden fixtures checked in; renderer changes require fixture review.

**Exit criteria (all green)**

1. Number-line slice renders accessible SVG from an AI-authored spec (integration proof like Project §10 OpenEdu proof, minus OpenEdu).
2. Conformance L1-L4 pass; Playwright a11y interaction test green.
3. `educational-visual/SKILL.md` lets an agent produce a validated `visual` spec without invalid fixtures.

---

### P2.5 — Composition smoke test (D8)

**Goal.** Prove cross-engine value **before** building Chart, GeoMap, Timeline, and Diagram renderers. A timeline selection drives a visual focus via the shared event bus — not package imports.

**Scope (in order)**

1. **Composition schema** — `docs/schemas/composition.schema.json` (lesson `{ id, engines[], bindings[] }`; binding actions use D5 `$defs.actionType`).
2. **Composition harness** in `interactive-engine` — load lesson fixture, register two engine instances, route namespaced events to D5 actions on a peer instance.
3. **Fixture** — `docs/fixtures/composition/narrative-timeline-visual.json` (timeline stub spec + visual spec + bindings).
4. **Timeline stub** — minimal Timeline engine adapter: parse thin `engines/timeline/SPEC.md` event list, emit `timeline.event-selected` on `select`; no full timeline renderer required for exit.
5. **Visual target** — existing P2 number-line or illustration entity receives `focus` from binding (`targetIdFrom`: `links.visualEntityId`).

**Exit criteria (all green)**

1. Playwright (or unit) test: select timeline event → visual entity focused; event log replayable.
2. No engine-to-engine package imports; routing only through harness bindings.
3. Fixture validates against `composition.schema.json`; embedded engine specs pass L1 on envelope schema.

**Not in scope:** Full Timeline/GeoMap/Chart UI; lesson-level quiz scoring (D7).

---

### P3 — Chart Engine

**Goal.** Quantitative reasoning (`how much / how does it compare`).

**Scope (in order)**

1. Author `schemas/chart-spec.schema.json` from thin [`engines/chart/SPEC.md`](engines/chart/SPEC.md) (normative doc done — do not expand vision prose before code).
2. Slices: **bar** and **line** through the full pipeline (spec → scene → layout → accessible SVG → fixtures).
3. Scales, ticks, axes as derived layout — semantics only in the spec (DESIGN §8, P2).
4. Component surface: bar, line, (future: area, scatter) — conformance-gated.
5. Agent skill + playground tab; fixtures.

**Exit criteria (all green)**

1. Bar and line slices pass full pipeline + Playwright keyboard/pointer/a11y.
2. Chart spec authored and versioned; impossible specs fail L1/L2.

---

### P4 — GeoMap Engine

**Goal.** Geographic reasoning (`where, and why there`).

**Scope (in order)**

1. Author `schemas/geomap-spec.schema.json` (currently missing — TODO) from geomap SPEC.
2. Slice: **region → marker → route** with GeoJSON data binding (DESIGN §9); MVP list per `engines/geomap/SPEC.md` §82.
3. Ground truth rules: no invented boundaries/values; provenance classes enforced (DESIGN §9; SPEC §9).
4. Agent skill + fixtures; L1-L4 conformance.

**Exit criteria (all green)**

1. GeoJSON regions/markers/routes slice green (incl. a11y of map semantics, not raw SVG).
2. Data-fidelity test: invented boundary/value fails validation.

---

### P5 — Timeline Engine

**Goal.** Temporal reasoning (`when, and what unfolds`).

**Scope (in order)**

1. Author `schemas/timeline-spec.schema.json` from thin [`engines/timeline/SPEC.md`](engines/timeline/SPEC.md) (stub used in P2.5 may be upgraded to full renderer).
2. Slice: **events / periods / tracks** end-to-end.
3. Playback (`play-pause`, `step`) via the shared runtime, not an engine-private mechanism (§7.4).
4. Agent skill + fixtures.

**Exit criteria (all green)**

1. Events/periods/tracks slice green with replayable event log.
2. Playback actions route through the standard action set.

---

### P6 — Diagram Engine

**Goal.** Structural reasoning (`how is it connected`).

**Scope (in order)**

1. Author `schemas/diagram-spec.schema.json` from thin [`engines/diagram/SPEC.md`](engines/diagram/SPEC.md).
2. Slice: **nodes / edges / auto-layout** (detect cycles → clean layout; label the layout as illustrative, DESIGN §9).
3. No internal imports of other engines (DESIGN §6).
4. Agent skill + fixtures.

**Exit criteria (all green)**

1. Nodes/edges slice green with deterministic auto-layout and provenance on generated positions.
2. L1-L4 conformance pass.

---

### P7 — OpenEdu Integration

**Goal.** OpenEdu **hosts** engines through `EngineHost` (D6); `{ type: "interactive" }` lesson node; widget compatibility; ADR re-recording. Composition is proven at P2.5 — P7 extends hosting and authoring, not first composition.

**Scope (in order)**

1. **`interactive-react`** — thin React mount that implements `EngineHost` from OpenEdu theme, i18n, a11y, and telemetry session. Core stays framework-independent and MUST NOT import OpenEdu.
2. **OpenEdu consumption proof** — lesson node `{ "type": "interactive", "engine": "…", "spec": {…} }` in `@open-edu/schemas`; learner `CourseRuntime` hosts one engine; composed lessons reuse P2.5 binding model at lesson level.
3. **Wire host services** — `onEvent` → OpenEdu telemetry; tokens → design-system; locale → i18n; assets → `.oep`. No shadow runtime (D6).
4. **Widget compatibility** (§95): keep widgets running; shims or parallel node types (`math.number-line` stays valid). Migration progressive.
5. **Authoring** — extend Course Creator Studio + course-authoring skill to emit engine specs. No `apps/studio` product.
6. **Extended composition** (optional) — Timeline + GeoMap narrative once P4 GeoMap exists; not a gate for first OpenEdu proof.
7. **Governance** — re-record D1–D9 as ADRs per `openedu-way/ADR.md`.

**Exit criteria (all green)**

1. Cross-engine composed lesson runs in a real OpenEdu lesson from an AI-authored spec, no renderer code written.
2. All engines pass the common conformance suite on the installed packages.
3. ADRs recorded; DESIGN §16 register links to them.

---

## 5. Engine Lifecycle Template

Every engine runs the same exit-gated cycle (DESIGN §14, mapped from `engines/visual/PROJECT.md`):

```text
Spec → Schema → Validator → Scene → Layout → Renderer(SVG) → Interaction
     → Accessibility → Conformance + fixtures → Agent skill → Playground → OpenEdu proof
```

The **Spec** step is where the per-engine normative documents missing today are authored (Chart, Timeline, Diagram) — never skipped before implementation.

---

## 6. Cross-Cutting Workstreams

| Workstream | Home | When |
|------------|------|------|
| Docs backlog: chart/timeline/diagram JSON schemas; geomap schema | engine phases | P3–P6 |
| Composition fixtures + harness | `docs/fixtures/composition/` | P2.5 |
| Composition schema | `schemas/composition.schema.json` | P2.5 |
| Legacy envelope migration (`geomap` wrapper, `schemaVersion`) | DESIGN D1 | Done (P0) |
| Thin normative SPEC.md (chart, timeline, diagram) | `engines/*/SPEC.md` | Done (P0 doc gate) |
| Vision prose expansion | `engines/*/VISION.md` | **Frozen** until P2 number-line green |
| Conformance suite + golden fixtures | `interactive-engine` harness | P1, per engine |
| Theming tokens | DESIGN §12.1 / EngineHost | P1 stub host; OpenEdu design-system is source of truth |
| A11y L4 checks, keyboard, reduced motion | DESIGN §12 / STRUCTURE §37 | per engine; prefs from host |
| CLI (`generate·validate·preview·inspect·components·recipes`) | PROJECT Phase 7 | P2 scaffold |
| Playground | PROJECT Phase 9 | P2+ (engine-dev only) |
| Interactive Studio | — | **Out** (D6 — Course Creator Studio) |
| Agent skills per engine + examples | DESIGN §10 | per engine |
| Extension engines (Simulation, Equation, 3D) | contract §89 | Deferred (not in P0-P7) |

---

## 7. Definition of Done (STRUCTURE §51 mapped)

| Criterion | Where |
|-----------|-------|
| Standalone repo exists under KnowledgeAssemble | Done — pushed |
| pnpm workspace configured | P1 |
| TypeScript strict | P1 |
| Schema package / core runtime / registry / primitives | P1 |
| React integration | P7 (`interactive-react`) |
| Every engine renders a valid JSON spec | P2-P6 |
| All engines pass common conformance suite | P2-P7, gate each |
| Packages independently publishable | P7 |
| OpenEdu can consume the published packages | P7 |
| No engine → OpenEdu dependency | P1 onward (contract boundary) |
| No arbitrary executable JS in specifications | L2/P10 (P1 harness) |
| Accessibility primitives + host a11y prefs | P1 |
| AI-generated JSON validates and renders without custom codegen | P2 slice proof |
| No parallel telemetry / i18n / Studio / scoring products | P1 onward (D6) |

---

## 8. Risks and Dependencies

- **Legacy envelopes must not be copied forward** (D1). Every ported example is restated in the shared envelope.
- **Missing normative specs gate their phases.** Chart/Timeline/Diagram have none today; spec-first prevents drift.
- **Schema technology.** JSON Schema is the canonical public contract; Zod provides runtime validation (STRUCTURE §11). That matches OpenEdu; engines still MUST NOT import `@open-edu/*` (D6).
- **Engine isolation.** Engines never import each other; composition is via the event bus (P2.5+).
- **Provenance and fixtures.** Renderer upgrades can only change output with reviewed fixture changes (DESIGN §11).
- **Duplicate-runtime risk (D6).** If P1 grows a telemetry store, i18n app, or Studio, stop and delete it. OpenEdu already has those.
- **Composition deferred (D8).** If P3 starts before P2.5 is green, stop — isolated engines replicate the widget catalog.
- **Dual assessment (D7).** Do not add scoring logic to engine packages; wire quiz nodes in OpenEdu only.
- **Visual scope creep (D9).** Reject timeline/flowchart/label-diagram in Visual PRs; use Timeline/Diagram engines.
- **Namespace.** Standalone `@knowledgeassemble/*` until host integration; D2 still applies.

---

## 9. Open Items / Decision Gates

1. **P0 → P1 gate:** standalone `@knowledgeassemble/*` now, or plan for immediate monorepo integration (`@open-edu/*`)? (D2 default: standalone first.)
2. **P6 → P7 gate:** integrate into the OpenEdu monorepo, or publish and consume as external packages?
3. Tooling: playground + CLI are in-scope for engine phases; Interactive Studio is **out** (D6 — extend OpenEdu Course Creator Studio).
4. Extension engines (Simulation/Equation/3D, §89) — deliberately deferred.

---

## 10. Status Board

| Phase | Status |
|-------|--------|
| P0 — Foundation and consolidation | IN PROGRESS |
| P1 — Platform skeleton | NOT STARTED |
| P2 — Visual Engine | NOT STARTED |
| P2.5 — Composition smoke test | NOT STARTED |
| P3 — Chart Engine | NOT STARTED |
| P4 — GeoMap Engine | NOT STARTED |
| P5 — Timeline Engine | NOT STARTED |
| P6 — Diagram Engine | NOT STARTED |
| P7 — OpenEdu integration | NOT STARTED |

---

## 11. Change Log

| Date | Change |
|------|--------|
| 2026-09-07 | Initial plan; P0 status captured; phases gated per DESIGN D3. |
| 2026-09-07 | D4: P2 number-line fixture and DESIGN envelope example aligned to schema `purpose` / `interaction`. |
| 2026-09-07 | D1: Visual and GeoMap engine docs migrated off `schemaVersion` / `{ "geomap": {} }` wrappers. |
| 2026-09-07 | D5: single semantic action enum and namespaced events; STRUCTURE pointer events marked renderer-only. |
| 2026-09-07 | D6: OpenEdu host seam; P1 must not rebuild telemetry/i18n/Studio/scoring; P7 hosts via EngineHost. |
| 2026-09-07 | D7–D9: assessment seam, P2.5 composition, Visual closed set; thin chart/timeline/diagram SPEC.md. |
| 2026-09-07 | D5 Visual interaction examples migrated; `composition.schema.json` stub for P2.5 fixtures. |