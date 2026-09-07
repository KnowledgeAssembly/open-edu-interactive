# Phase 3 — Chart Engine: Detailed Implementation Plan

**File:** `docs/PLAN-P3.md`
**Status:** Detailed task breakdown for the P3 phase (supersedes nothing; expands `docs/PLAN.md` §4 P3)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P3
**Do this first:** read, in order — `docs/DESIGN.md` (§4, §5, §8, §9, §11, §12.1, §15 D9, §16), `docs/INTERACTIVE-ENGINE-SPEC.md` (§22, §67, §68–§69, §82), `docs/engines/chart/SPEC.md` (whole — normative, thin), `docs/engines/chart/VISION.md` (context only — stays Draft, do not enshrine prose), `docs/engines/visual/SPEC.md` (§9 vocabulary, §82 namespaced result events), `docs/engines/visual/ARCHITECTURE.md` (§2 invariant 5, §19–§20, §54–§57), `docs/PLAN.md` (§4 P3, §10 status board), `docs/PLAN-P2.md` (scene/layout/render/validation conventions and the P2 API you mirror), `docs/PLAN-P2.5.md` (composition + thin-engine conventions; the timeline stub you model the engine package on). These are normative or load-bearing references; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Build `packages/chart-engine` — the second real engine package (`EngineType 'chart'`) on top of `@knowledgeassemble/interactive-engine` — and prove it through **bar** and **line** vertical slices end-to-end: spec → schema → semantic scene → deterministic scale/layout → accessible SVG → tabular alternative → validation → golden fixtures → browser conformance. Scales, ticks, and axes are **derived layout**, never authored semantics (PLAN.md P3 scope item 3, DESIGN §8/P2).

**Non-goals (hard). Do NOT:**
- Build `area` or `scatter` kinds at P3. `chart-spec.schema.json` `content.kind` is a **closed enum `["bar","line"]`**; area/scatter are future phases on the same envelope (chart SPEC §2). Adding them here is scope creep — review-reject any kind outside the closed set (DESIGN §15).
- Build Timeline/Diagram/GeoMap behavior or Visual kinds (`number-line`, `fraction`, `clock`, `illustration`, …) — D9, no engine smuggling.
- Import any peer engine package or `@open-edu/*` (D2/§6). `chart-engine` depends only on `@knowledgeassemble/interactive-engine` + `zod`.
- Build React, a dashboard library, a Studio app, telemetry, i18n product, theme source-of-truth, or scoring engine (D6). Theming via `EngineHost.tokens`; text via `EngineHost.locale`.
- Add runtime deps beyond `zod`. **No d3.** Scale/ticks/axes math is hand-written and deterministic (d3 pulls in non-determinism and bundle weight; not needed for the closed slice).
- Use wall-clock time, `Math.random`, `Date.now`, or any non-determinism in scene/layout/SVG (P4). Determinism is tested, including a two-run byte-identical fixture.
- Add arbitrary JS, event handlers, `javascript:` URIs, or document/`on*` attributes to any spec or emitted SVG (P2/P10, visual SPEC §75).
- Invent data or derived numbers. Values come **only** from `content.data` + declared `measures`; provenance `sources` on the envelope (DESIGN §9). No authored "derived aggregate" columns.

**Non-negotiables (carried from P1/P2/P2.5, extended for Chart).**
- `additionalProperties:false` on the chart schema AND on every nested object — including `dimensions[]`, `measures[]` — with the documented exception of `data` rows (dynamic keys, see §2 rule 7).
- Shared §67 error codes only: `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Never bespoke.
- D5 semantic actions only (`select`, `deselect`, `focus`, `filter`, `clear-filter`, `reset`, …). No `click`/`pointer.*`/`highlight`/`show` in specs. Renderer input maps outside the spec.
- Event-only mutation through the shared reducer/`EventLog`; namespaced result events `chart.<…>` per SPEC §82; the log stays serializable and replayable (P4).
- Semantic-first: specs describe meaning (dimensions, measures, data), never `x`/`y`/`width`/pixels. Explicit geometry is not part of the chart spec surface.
- SVG is a compiled artifact; the canonical source is the semantic scene (visual ARCHITECTURE §2).
- Tabular alternative is a first-class L4 output derived from the same semantic model (chart SPEC §3.3) — nothing is conveyed by shape/color alone.

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P2.5 must be landed and its gate green

The repo currently shows P2.5 **DONE** on `main` (PR #6 merged, `b371c8b`): `@knowledgeassemble/timeline-engine` stub, composition runtime (`Lesson`/`Router`), Visual `illustration` kind, conformance `?engine=composition` + `apps/conformance/e2e/composition.spec.ts`, golden event log. Before any P3 work:

1. Confirm `main` posts the merge and the full gate is green: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
2. `docs/PLAN.md` §10 shows P2.5 `DONE` and §11 has the P2.5 lines (verified — do not re-do).
3. Confirm the P3 **chart** docs state: `docs/engines/chart/SPEC.md` is thin (normative reference for P3; it says "Status: Proposed (thin)" — T0 upgrades it to "Normative at P3" in a reviewer-approved edit, or leaves it if reviewers prefer v1 freeze); `VISION.md` stays Draft. `schemas/chart-spec.schema.json` does **not** exist yet — it is authored at T1.

If anything above is red, stop and fix it first. P3 builds directly on P2/P2.5 code and must not paper over a failing gate.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p3-chart-engine
```

Commit per task with the repo style (`P3 T<nn>: <one-liner>`). Open a PR against `main`; land with `gh pr merge <n> --merge --delete-branch`. `main` is PR-protected — no direct pushes.

### 1.3 Grounded current state (verify on disk before writing code)

| Asset | Location | Status |
|---|---|---|
| Chart normative spec | `docs/engines/chart/SPEC.md` | Thin (62 lines), MVP `content.kind: bar \| line`, envelope example, "Proposed (thin)" |
| Chart vision | `docs/engines/chart/VISION.md` | Draft — frozen; context only at P3 |
| Chart JSON schema | `docs/schemas/chart-spec.schema.json` | **Missing — authored at T1** (mirror `visual-spec.schema.json` conventions) |
| Core public surface | `packages/interactive-engine/src/index.ts` | `Engine`/`EngineRegistry`, `runPipeline`/`ValidationResult`, `validateEnvelope`, `EventLog`, `baseReducer`/`initialState`, `EngineError`/`ERROR_CODES`, `ACTION_TYPES`, `A11yNode`/`a11yTreeOf`, `EngineHost` |
| Pipeline template | `packages/visual-engine/` | `schema.ts`/`schemas/visual-spec.schema.json`/`scene`/`layout`/`render`/`validation`/`components`/`engine.ts` + `fixture/number-line/` + `e2e/number-line.spec.ts` — mirror this shape |
| Thin-engine template | `packages/timeline-engine/` | `schema.ts`/`engine.ts`/`reducer.ts`/`index.ts` — the deps/scripts/`.js`-specifier discipline to copy |
| Conformance app | `apps/conformance/src/main.ts` + `composition.ts` | `?engine=core|visual|composition` routes; `window.__harness`/`__visualHarness`/`__compositionHarness`; add `?engine=chart` |
| Composition e2e home | `apps/conformance/e2e/composition.spec.ts` | Browser-only composition specs live with the app (P2.5 review fix); engine e2e still lives in each engine package (`packages/visual-engine/e2e/`) — chart e2e follows the engine-package convention |
| Agent skill convention | `docs/engines/visual/skills/educational-visual/SKILL.md`, `docs/engines/composition/skills/composition/SKILL.md` | `<engine>/skills/<name>/SKILL.md` — chart home mirrors this |

### 1.4 Decision gates to close at T0 (record in `docs/PLAN.md` §11 change log before implementing)

- **Chart-D1 — Closed `content.kind` at P3.** Exactly `["bar","line"]`. Area/scatter are future (same envelope), OUT of the P3 schema enum and scene builder. If a reviewer pushes back, the fallback is a plan note, never a silent widening.
- **Chart-D2 — Derived scales, fixed baseline.** Bar y-domain starts at `0` (honest ratio comparison, DESIGN error-bar honesty); line y-domain = `[min,max]` of the data with a deterministic 10% padding; "nice ticks" use a fixed step ladder (`1, 2, 2.5, 5 × 10^k`, target 4–6 ticks) — no d3, byte-deterministic. Ticks/axes/gridlines are scene nodes derived at layout, never authored.
- **Chart-D3 — Namespaced result events.** `select` of a data point emits `chart.data-point-selected`; `focus` emits `chart.data-point-focused`. The event payload carries the **full row** (mirroring the timeline Gap-B lesson so a future composition binding can resolve `targetIdFrom` off a row, e.g. `links.*`).
- **Chart-D4 — Line minimum density.** A line slice requires ≥ 2 data points (`INVALID_ENTITY` at L2); 1 point is degenerate and impossible.
- **Chart-D5 — Provenance repository decision.** Chart keeps `sources[]` as a **required** top-level reference at the engine level (stricter than an optional envelope `sources`). This is deliberate: a chart that renders a quantitative claim without a source-class violates DESIGN §9 honesty. If the shared envelope later mandates provenance, this decision is revisited (never silently relaxed).

---

## 2. The Chart specification contract (author this first)

Author `docs/schemas/chart-spec.schema.json` (canonical) + Zod mirror in `packages/chart-engine/src/schema.ts`, from `chart/SPEC.md` §2 restated in the shared envelope (D1 — no `{ "chart": {} }` wrapper, no `schemaVersion`). Target content shape:

```jsonc
{
  "type": "chart",                      // envelope; L1 via interactive-engine.schema.json
  "version": "1.0.0",
  "id": "rainfall-monthly",
  "metadata": { "title": "Monthly rainfall" },
  "purpose": { "learningObjective": "Compare rainfall across months", "reasoningMode": "compare" },
  "content": {
    "kind": "bar",                      // closed enum ["bar","line"]
    "dimensions": [{ "id": "month", "type": "ordinal" }],        // ordinal | categorical | quantitative | time
    "measures": [{ "id": "rainfall", "type": "quantitative", "unit": "mm" }],
    "data": [
      { "id": "row-jan", "month": "Jan", "rainfall": 20 },
      { "id": "row-may", "month": "May", "rainfall": 110 }
    ]
  },
  "interaction": { "mode": "explore", "actions": ["select", "focus", "filter", "reset"] },
  "questions": [],
  "sources": [{ "class": "authoritative" }],   // provenance (DESIGN §9)
  "accessibility": { "label": "Bar chart of monthly rainfall in millimeters" }
}
```

Rules to encode in the schema + Zod (`additionalProperties:false` at every level except `data` rows):

1. `content.kind` — closed enum `["bar","line"]`; `additionalProperties:false` on `content`. Unknown kind → `INVALID_ENTITY` at L2 (schema constrains the enum; semantics decide compatibility).
2. `dimensions[]` — `{ id (id-pattern, unique), type }`, `type` ∈ `ordinal | categorical | quantitative | time`. ≥ 1 dimension. Order is the rendering order (ordinal/categorical preserve first-appearance order of data).
3. `measures[]` — `{ id (id-pattern, unique), type: literal "quantitative", unit?: string }`. ≥ 1 measure. Multiple measures render as grouped bars / per-measure series (generic loop; fixtures cover the single-measure case).
4. `data[]` — ≥ 1 row. **Dynamic-key exception:** a row object's value keys are dimension/measure ids (validated at L2 — the schema cannot name dynamic keys). Every row MUST also carry an optional `id` (id-pattern) and optional `links?: Record<string,string>` (future composition, mirroring timeline Gap-B). Value typing: ordinal/categorical dimension values are non-empty strings; quantitative/time are finite numbers (time MAY be an ISO-8601 string; parse deterministically at L2).
5. Row coherence (L2, not schema): every declared dimension and measure id MUST have a value in every row (`INVALID_ENTITY`); a row key that references an undeclared id is `INVALID_ENTITY`; duplicate row `id`s / duplicate dimension or measure ids → `INVALID_ENTITY`; a `links` target that names no row id or `id` value → `INVALID_REFERENCE` (only if validated).
6. Semantic-first: NO `x`, `y`, `width`, `height`, `color` values at the spec surface. Style accents reference host tokens via envelope surface only (no per-node raw colors; L4 rejects color-only meaning).
7. Provenance: `sources[]` carries `class` (`authoritative | illustrative | simulated`). Derived aggregates are never authorable — the engine only ever renders declared `data`.

Because the P1 core already runs L1 on the envelope, `ChartEngine.validate` reuses `runPipeline` and supplies its own **L2 semantic**, **L3 layout**, **L4 accessibility** hooks (mirroring `visual-engine`).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prereqs, decision-gating, chart docs freeze
- Reconcile §1.1 (P2.5 landed; gate green). Branch per §1.2.
- Record Chart-D1…Chart-D5 (§1.4) in `docs/PLAN.md` §11 change log before implementation.
- Confirm `docs/engines/chart/SPEC.md` stays the normative reference (spec-version bump from "Proposed (thin)" to "Normative at P3" ONLY as a reviewer-approved follow-up; otherwise leave as-is). Do NOT expand `VISION.md` prose.

**Done when:** PLAN.md §11 has the four D3 decision lines; branch `feat/p3-chart-engine` exists; `pnpm -w test` is green on the branch base.

### T1 — Chart-engine scaffold + schema + parity guardrail
- Create the package tree (mirror §1.3 pipeline template):

```text
packages/chart-engine/
  package.json                 # name: @knowledgeassemble/chart-engine; deps: interactive-engine + zod only
  tsconfig.json                # extends ../../tsconfig.base.json
  vitest.config.ts
  playwright.config.ts         # testDir ./e2e; webServer: pnpm --filter @knowledgeassemble/conformance dev (port 5173)
  src/
    index.ts                   # public exports (types + functions only)
    schema.ts                  # CHART_KINDS const + ChartSpecs Zod + types
    schemas/chart-spec.schema.json   # canonical (authored here; also copy to docs/schemas/)
    scene/types.ts, scene/build.ts
    layout/scales.ts, layout/geometry.ts, layout/engine.ts
    render/types.ts, render/svg.ts
    validation/semantic.ts, validation/layout.ts, validation/accessibility.ts
    engine.ts                  # ChartEngine implements core Engine
  test/
    schema-parity.test.ts      # §5 guardrail
    schema.test.ts, scene.test.ts, scales.test.ts, layout.test.ts, render-svg.test.ts,
    validation.test.ts, instance.test.ts
  e2e/chart.spec.ts            # Playwright (T7)
  fixture/{bar,line}/          # golden fixtures (T7)
```

- `package.json` scripts identical to `visual-engine` (`typecheck`, `lint` `eslint src test`, `test` `vitest run`, `playwright`). `pnpm install` links the workspace.
- Author `schemas/chart-spec.schema.json` (canonical) per §2. Mirror in `src/schema.ts` with `z` (`.strict()` everywhere; dynamic `data` row = `z.record(z.union([z.string(), z.number()]))` — value-type refinement happens at L2, not schema).
- **Parity guardrail** (`test/schema-parity.test.ts`): `content.kind.enum` (sorted) === `CHART_KINDS` (sorted); `content.kind` required; `dimensions[]`/`measures[]` `additionalProperties === false`; `content.additionalProperties === false`; `measures[].type` literal `quantitative`; no `makeItPretty|svgMagic|drawNicely|x|y|width` in the content surface; `sources[].class` enum matches provenance and equals `{authoritative,illustrative,simulated}`.

**Done when:** `pnpm --filter @knowledgeassemble/chart-engine typecheck` green with `.js` specifiers; parity test green; the SPEC §2 envelope example parses; `content.kind:"scatter"` and an unknown `content` key fail (`INVALID_ENTITY` at L2 / schema error at L1).

### T2 — Scene model + bar/line scene builders
Files: `scene/types.ts`, `scene/build.ts`.

- `scene/types.ts` — chart `SemanticRole`: `'chart' | 'axis' | 'gridline' | 'tick' | 'label' | 'value-label' | 'bar' | 'line-segment' | 'point' | 'marker' | 'legend' | 'selectable'` (+ `'group'`, `'visual'` for structure). `SceneNode` / `Scene` shapes reuse the visual-engine conventions (`bounds?` set by layout, `acceptsActions?: ActionType[]`, `interactive?`, `children[]`).
- `scene/build.ts` — `buildScene(content): Scene`: walks `dimensions`/`measures`/`data` (in order) and emits:
  - bar: one `bar` node per (row, measure): `id: <measureId>-bar-<row.id|rowIndex>`, `role:'selectable'`, `interactive:true`, `acceptsActions:['select','focus']`, metadata `{ dimensionValue, measureValue }`; a group per measure.
  - line: one `line-segment` group + one `point`/`marker` per (row, measure): `id: <measureId>-point-<row.id|rowIndex>`, selectable; `point` carries the plotted value.
  - one `axis`-x and `axis`-y scaffold per measure, plus derived-placeholder `tick`/`gridline`/`label` IDs (`<measureId>-axis-x`, `<measureId>-tick-<n>`, `<measureId>-gridline-<n>`, `<measureId>-label-<row.id|rowIndex>`) that T3 layout fills.
  - deterministic ids (null-row-`id` fallback to zero-padded index), assert uniqueness (`INVALID_ENTITY` on duplicates).
- Keep scene building **pure**: no layout yet, no bounds.

**Done when (test-first):** the SPEC §2 bar example yields `(rows × measures)` bar nodes with deterministic ids and correct metadata; the line example yields ≥ 2 point nodes per measure; duplicate row `id` → `INVALID_ENTITY`; a row with an undeclared key, or a measure dimension mismatch, is caught here or at T5 (validators) — at minimum the scene builder never throws on well-formed data and never produces duplicate ids.

### T3 — Deterministic scales + layout engine
Files: `layout/scales.ts`, `layout/geometry.ts`, `layout/engine.ts`.

- `scales.ts` — pure functions (no d3):
  - `linearScale(domain:[number,number], range:[number,number])` + `invert`.
  - `bandScale(categories: string[], range:[number,number])` (ordinal/categorical): even bands with inner gap.
  - `niceTicks(domain, target=5)`: fixed step ladder `1,2,2.5,5 × 10^k`, first step ≥ `span/(target)` such that the returned `domain` is extended to cover the full data extent (its `min ≤ data min` and `max ≥ data max`), ticks land on clean values; **byte-deterministic**; return `{ ticks: number[], domain: [number,number] }`.
  - Bar y-domain: `[min(0, min), max(0, max)]` over the measure values (Chart-D2 baseline anchored so negative values are handled honestly, not by `max(|v|)`). Line y-domain: padded `[min,max]` by exactly 10%. Encoding of these rules lives in ONE function so a golden change requires fixture review.
- `geometry.ts` — `Rect/Point`, `union`, `overlaps`, `contained`, `translate` (port from visual-engine; chart-local copy, no cross-engine import).
- `layout/engine.ts` — `layout(scene, ctx): Scene` where `ctx` comes from `EngineHost.tokens` (`{ width, height, minTouchTarget, textStyle }`, mirroring visual T3/T6). Assigns `bounds` to every node: bars from band × linear y; points from domain mapping; axes/gridlines from `niceTicks`; tick/label position derived; interactive nodes sized ≥ `minTouchTarget`. Pure: identical input → identical bounds.

**Done when (test-first):** `niceTicks([0,110])` yields the exact expected tick array (assert a literal, e.g. `[0,25,50,75,100]` or the decided ladder output); `layout(barScene)` places bars monotonically with bar baseline at y=0; determinism test (two identical calls byte-equal bounds); `line` with 1 point — rejected upstream (Chart-D4), so layout assumes ≥2 points.

### T4 — SVG renderer + a11y tree + tabular alternative + interaction map
Files: `render/types.ts`, `render/svg.ts`.

- `svgFrom(scene, ctx): { svg: string; a11y: A11yNode[]; interactive: Array<{ id: string; action: ActionType }>; tabular: TabularRow[] }`.
  - Semantic SVG: `<svg>` with `<title>`/`<desc>` from envelope `accessibility`; `<g id="chart-root">`; groups per measure; nodes → elements (`rect` for bar, `polyline`/`circle` for line/point) with `id`, `data-oedu-role`, `data-oedu-value`; deterministic attribute order and id order (scene walk order).
  - **Security:** whitelisted attributes only; never `<script>`, `on*`, `javascript:`. **Determinism:** no timestamps, stable ordering (two runs byte-identical).
  - `a11y`: reuse core `A11yNode`; one node per interactive bar/point with mapped `role` and non-empty `label` (from row label/measure value/unit; fall back to `id`). Never empty.
  - `tabular`: derive `{ rowLabel, values: { measureId, value|null, unit? }[] }[]` from the **same** scene/data — the L4 tabular alternative (SPEC §3.3). The conformance app renders it as an accessible `<table>`; the SVG itself carries no table.
  - `interactive` map: bars/points with `acceptsActions` → the D5 action a renderer may dispatch (`select`/`focus`). Exposed for the host, never embedded.

**Done when:** golden `expected.svg` for the bar fixture is generated and stable across two runs (determinism test); no `onclick`/`<script>`; `a11y` has labeled button-equivalent nodes for every bar; `tabular` lists all rows/measures exactly; `interactive` maps each bar to `select`/`focus`.

### T5 — Chart validator (L2/L3/L4 hooks)
Files: `validation/semantic.ts`, `validation/layout.ts`, `validation/accessibility.ts` → plugged into core `runPipeline`.

- **L2 semantic** — `content.kind` ∈ `CHART_KINDS` (`INVALID_ENTITY`); dimension/measure ids valid + unique (`INVALID_ENTITY`); every row references only declared ids + optional `id`/`links` (`INVALID_ENTITY`); every declared id present in each row (`INVALID_ENTITY`); value typing per §2 rule 4 (`INVALID_ENTITY`); line requires ≥ 2 points (Chart-D4, `INVALID_ENTITY`); `acceptsActions` ⊆ D5 (`INVALID_ACTION`); `links` → declared ids (`INVALID_REFERENCE`); provenance `sources[].class` valid (`INVALID_SPEC`).
- **L3 layout** — after `layout(scene)`: all bounds inside canvas; no required-region overlap; interactive targets ≥ `minTouchTarget` (`INVALID_STATE` / `ACCESSIBILITY_ERROR` when a hard constraint, warning otherwise).
- **L4 accessibility** — envelope `accessibility.label` present; every interactive node has a label; no color-only meaning (flag styled nodes without label/role distinction); `tabular` non-empty for ≥1 row (reads all data).
- Hooks return `ValidationResult` and plug into `runPipeline(spec, { semantic, layout, accessibility })`.

**Done when (test-first, negatives before the validator passes them):** SPEC §2 fixture → `valid:true, issues:[]`; a `kind:"scatter"` spec fails L2 `INVALID_ENTITY`; a 1-point line fails `INVALID_ENTITY`; a data row with undeclared key fails `INVALID_ENTITY`; broken `links` fails `INVALID_REFERENCE`; a color-only marker fails L4 `ACCESSIBILITY_ERROR`; an out-of-canvas layout fails L3 `INVALID_STATE`.

### T6 — ChartEngine facade + registry + namespaced events
Files: `engine.ts` (+ `test/instance.test.ts` registering in the core `EngineRegistry`).

- `ChartEngine implements Engine` (`type:'chart'`): `validate(spec)` = `runPipeline` with the T5 hooks; `instantiate(spec, host, id?)` — validate (throw `INVALID_SPEC` on failure), build scene → layout → render, then wrap in an `EngineInstance` whose `dispatch` extends `baseReducer`:
  - `select` of a bar/point id → append `chart.data-point-selected` with `data`/`action.payload` = **full row record** (+ `id`/`links`) — Chart-D3.
  - `focus` → `chart.data-point-focused` likewise.
  - `filter`/`deselect`/`reset`/`play-pause`/`step` via `baseReducer` only. `filter` semantic is fixed: dispatch `filter` with `payload.ids` = row-id subset → engine renders only those rows; `clear-filter` restores all. `play-pause`/`step` are accepted as state no-ops at P3 (see guardrail 10). No chart-specific payload invention.
- `snapshot()` returns `EngineState` + read-only `scene`, `svgResult`, `tabular` (deterministically derived). Wire `EngineHost.tokens` → `LayoutContext`, `Host.locale` → text resolution.
- Import **only** the core public surface (`index.ts`); `.js` specifiers everywhere.

**Done when (test-first):** registry `get('chart')` returns the engine; `validate(spec)` valid → valid; `instantiate(barSpec)` → `dispatch({type:'select', target:{id:'<bar id>'}})` → `snapshot().selection` contains the id AND the emitted `chart.data-point-selected` carries the full row payload with `links` if present; an unknown `content.kind` fails `validate`; event ids follow `<instanceId>:<seq>`.

### T7 — Golden fixtures + conformance tab + browser e2e
- Golden fixtures per kind (`fixture/{bar,line}/`): `input.chart.json`, `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.tabular.json`, `validation.json`, plus a fixture `README.md`. Asserted by snapshot tests (deterministic; re-running tests does not mutate them).
- Conformance `?engine=chart`: `apps/conformance/src/chart.ts` mirroring `main.ts` visual route — register `ChartEngine`, load the bar fixture, inject `svgFrom(...)` SVG into the DOM, render `tabular` as a real `<table>` with `aria-label`, expose `window.__chartHarness = { dispatch, snapshot, events, svg, tabular, tryCreate }`; route wiring in `apps/conformance/src/main.ts`.
- `e2e/chart.spec.ts` (Playwright):
  1. **a11y** — SVG has `<title>`/`desc`; every bar/point has a non-empty `aria-label`; a `<table>` alternative exists and lists all rows (nothing color-only).
  2. **interaction** — keyboard/pointer activation on a bar dispatches `select`; snapshot selection contains the bar id; `chart.data-point-selected` recorded with the full row.
  3. **replay** — events replay in `seq` order via core `EventLog` (monotonic; determinism).
  4. **data fidelity** — `tryCreate` of a spec with an invented/nondeclared data column fails with a shared code; a 1-point line fails.
  5. **rejection** — unknown `content.kind`/unknown content key fails `tryCreate`.

**Done when:** all five specs green in a real browser against installed `chart-engine` + `interactive-engine`.

### T8 — Agent skill + doc reconciliation + full exit gate
- Agent skill `docs/engines/chart/skills/quantitative-chart/SKILL.md` (mirror the visual/composition skill homes; adjust if the repo convention differs) — when to use Chart vs a Visual component vs Timeline; never invent data; `kind` closed set; dimensions/measures/rows shape; derived scales (never author pixels); tabular alternative; D5 interaction; provenance; validate.
- Bounded proof: the skill's canonical example JSON is checked in (e.g. `docs/fixtures/chart/skill-example.json`) and round-trips `ChartEngine.validate` valid in a unit test.
- `docs/fixtures/chart/README.md`: validation commands (`chart-spec.schema.json` L1 + embedded `interactive-engine.schema.json` L1 env) and the "no invented values" rule.
- `docs/PLAN.md` §10 status board `P3 → DONE` **only after** the §4 gate is green; add §11 change-log lines (P3 DONE + the four D3 decisions). Flip `chart/SPEC.md` status per T0 decision.

**Done when:** full exit gate green (§4); PLAN.md status board + change log consistent.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P3 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Bar and line slices pass full pipeline + Playwright keyboard/pointer/a11y | T4 golden `expected.{svg,scene,a11y}.json` + T5 validation + T7 `e2e/chart.spec.ts` (interaction, replay, a11y, data fidelity) |
| 2 | Chart spec authored and versioned; impossible specs fail L1/L2 | T1 `chart-spec.schema.json` (1.0.0) + parity test; T5 negative tests (`scatter` kind, 1-point line, undeclared data column, broken links) |

**Self-checks (all MUST pass, not just the two PLAN criteria):**
- **No engine smuggling (D9):** `grep -rn "from '@knowledgeassemble/\|@open-edu/" packages/chart-engine/src` yields only `interactive-engine`; no `visual-engine|timeline-engine|geomap-engine|diagram-engine` imports; no visual kinds / no `timeline|flowchart|label-diagram` in src except negative-test strings.
- **Closed kinds:** `grep -rn "scatter\|area" packages/chart-engine/src/schemas/chart-spec.schema.json` → only a `description`, never the `kind` enum.
- **Deps:** `packages/chart-engine/package.json` deps = `interactive-engine` + `zod`; no d3.
- **Determinism:** two-run byte identical `expected.svg` test green; `grep -rn "Date.now\|Math.random\|performance.now\|d3" packages/chart-engine/src` → empty.
- **Shared error codes only:** thrown codes ⊆ §67 set (`grep -rn "'[A-Z_]*ERROR'\|'INVALID_'" packages/chart-engine/src`).
- **Semantic-first:** no `x`/`y`/`pixel`/`width` authored in specs; `grep` of the fixture `input.chart.json` surfaces no geometry keys.
- **D6:** no store/i18n/studio/scoring modules; `questions` stay empty arrays in fixtures.

---

## 5. Schema ↔ Zod parity guardrail (T1 must include)

`test/schema-parity.test.ts` (chart) asserts the canonical JSON Schema and the runtime Zod mirror stay in sync, per T1 §3 list — plus:
- `dimensions[].type` enum (sorted) === the TS dimension-type const; `measures[].type` literal `quantitative`.
- the emitted SVG/a11y/tabular contract reciprocity: every interactive scene node appears in the a11y tree AND in `tabular` (parity between `render` map, `a11y`, and the tabular derivation).
- the fixture `input.chart.json` for both kinds round-trips `ChartEngine.validate` valid, and its `expected.*` files are byte-stable.

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not put React/DOM in `packages/chart-engine`.** SVG is pure data; the `<table>` alternative is built in the conformance app, not the engine.
2. **Do not import peer engines or OpenEdu** (D2/§6). Only `@knowledgeassemble/interactive-engine` public surface + `zod`.
3. **Do not build Visual/Timeline/GeoMap/Diagram behavior, area, or scatter** (D9 + Chart-D1). A `kind` outside `["bar","line"]` is a contract violation — reject in review.
4. **Do not reach for d3.** Scales/ticks/axes are hand-written pure functions; determinism (P4) is tested and a golden change requires fixture review.
5. **Do not invent data.** Every plotted value comes from `content.data` + declared measures; nothing is aggregated, derived, or defaulted (DESIGN §9). Provenance `sources[]` is required.
6. **Do not author geometry.** No `x`/`y`/`width`/pixel in specs; axes/ticks/positions are derived (Chart-D2). No LLM-pleaser props.
7. **Do not emit unsafe SVG.** Whitelist attributes; never `on*`, `<script>`, `javascript:`. Security is non-negotiable (SPEC §75).
8. **Do not use wall-clock/time/randomness** anywhere (P4). Determinism is tested with byte-identical fixtures.
9. **Use exactly the §67 codes** — bad kind → `INVALID_ENTITY`; bad ref → `INVALID_REFERENCE`; bad spec shape → `INVALID_SPEC`; bad action → `INVALID_ACTION`; layout infeasibility → `INVALID_STATE`; a11y gap → `ACCESSIBILITY_ERROR`.
10. **Namespaced events only.** `select` → `chart.data-point-selected`; `focus` → `chart.data-point-focused`; payload = full row (+ `links`). No per-entity event-name invention beyond these.
11. **`.js` import specifiers + `src/index.ts` as the only public surface** of `chart-engine`; deep imports into `interactive-engine` internals are forbidden (NodeNext).
12. **Test-first.** Every task T1–T7 starts with its failing test/fixture; "done" means that test passes (P1/P2/P2.5 convention).
13. **Reuse, don't reimplement the event system.** Use the core `baseReducer`/`EventLog`; chart extends `baseReducer` for its two namespaced result events only.

---

## 7. Definition of Done (P3-specific)

P3 is complete when:

- `docs/PLAN.md` §4 P3 exit criteria 1–2 are green, verified by the §4 gate commands (not assertion).
- `packages/chart-engine` passes `typecheck`, `lint`, unit tests, and browser e2e.
- `chart-spec.schema.json` (1.0.0) is canonical and mirrored in Zod with the §5 parity guardrail green.
- Bar and line slices each have byte-stable golden fixtures (`input.chart.json`, `expected.{svg,scene,a11y,tabular}.json`, `validation.json`) checked in.
- Conformance `?engine=chart` works; the quantitative-chart skill example round-trips validation.
- `docs/PLAN.md` marks P3 **DONE**, logs the change (including Chart-D1…Chart-D4), and the chart SPEC/VISION statuses match the T0 decision.

Do **not** start P4 until the §4 gate is green.