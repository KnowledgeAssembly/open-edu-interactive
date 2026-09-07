# Phase 6 — Diagram Engine: Detailed Implementation Plan

**File:** `docs/PLAN-P6.md`
**Status:** Detailed task breakdown for the P6 phase (supersedes nothing; expands `docs/PLAN.md` §4 P6)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P6
**Do this first:** read, in order — `docs/DESIGN.md` (§4, §5, §8, §9, §11, §12.1, §15 D9, §16), `docs/INTERACTIVE-ENGINE-SPEC.md` (§7.1–§7.4, §22, §67, §68–§69, §82), `docs/engines/diagram/SPEC.md` (whole — thin, normative; it says "gates P6 implementation; expand in code, not prose"), `docs/engines/diagram/VISION.md` (context only — stay Frozen, do not enshrine prose), `docs/PLAN.md` (§4 P6, §10 status board), `docs/PLAN-P2.md` (scene/layout/render/validation conventions and the P2 API you mirror), `docs/PLAN-P4.md` (the closest full-renderer template, incl. the L2.5-geographic tier you mirror as L2.5-structural), `docs/PLAN-P5.md` (namespaced-event + reducer-extension conventions). These are normative or load-bearing references; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Build `packages/diagram-engine` — the fifth and final engine package (`EngineType 'diagram'`) on top of `@knowledgeassemble/interactive-engine` — and prove a **nodes → edges → auto-layout** slice end-to-end (PLAN.md §4 P6): spec → schema → semantic scene → deterministic graph layout (**cycle detection → clean layout**) → accessible SVG → **structured relationship list** alternative → validation → golden fixtures → browser conformance. Structural meaning (`how is it connected`) is authored; positions, layers, rings, and routing are **derived layout** (DESIGN §8/P2) that is **deterministic** and carries **`illustrative` provenance** (DESIGN §9, SPEC §2 "Auto-layout positions are illustrative unless provenance says otherwise") — this provenance is the PLAN exit-criterion-1 evidence.

**Non-goals (hard). Do NOT:**
- Build `label-diagram` (labels over an image) at P6. The SPEC replaces `science.label-diagram` widgets *over time* — that slice needs an image host + anchor points and is a **future phase**; the P6 slice is nodes/edges/auto-layout only (SPEC §3).
- Build Timeline/Visual/GeoMap/Chart behavior — D9, no engine smuggling. Replacing flowchart widgets happens in Diagram, never in Visual.
- Import any peer engine package or `@open-edu/*` (D2/§6). `diagram-engine` depends only on `@knowledgeassemble/interactive-engine` + `zod`.
- Build a diagramming IDE, freehand canvas, bendable-arrow editor, or export-to-Visio surface (SPEC §4 non-goal).
- Use d3, d3-hierarchy, d3-force, dagre, graphlib, cytoscape, viz.js, or any graph-library. Graph algorithms (Kahn topo sort, cycle detection, longest-path layering, radial/grid placement) are hand-written pure functions — deterministic (P4). No force-directed physics (non-deterministic).
- Assert causation or temporal order where the author did not: never infer `leads-to`/causal meaning from adjacency, and `relationship` must be explicit on every edge (SPEC §4 non-goal: "Not causal claims without explicit `relationship` types").
- Use wall-clock time, `Math.random`, `Date.now`, or any non-determinism in graph analysis/layout/SVG (P4). Determinism is tested, including a two-run byte-identical fixture.
- Add arbitrary JS, event handlers, `javascript:` URIs, or document/`on*` attributes to any spec or emitted SVG (P2/P10).
- Invent nodes, edges, or relationships. Everything rendered comes from `content.nodes[]`/`content.edges[]`; provenance via envelope `sources[]` (DESIGN §9).
- Author pixels. `content` carries structural semantics (nodes, edges, `relationship` values) only; `layout.type` is a **semantic strategy selector**, not coordinates. No `x`/`y`/`width`/`position` at the spec surface.

**Non-negotiables (carried from P1–P5, extended for Diagram).**
- `additionalProperties:false` on the diagram schema AND every nested object — `content`, `nodes[]`, `edges[]`, `layout`. Unknown keys are a validation error, never ignored (P11).
- Shared §67 error codes only: `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Never bespoke.
- D5 semantic actions only (`select`, `deselect`, `focus`, `expand`, `collapse`, `follow`, `reset`, …). No `click`/`pointer.*` in specs. Renderer input maps outside the spec.
- Event-only mutation through the shared reducer/`EventLog`; namespaced result events `diagram.<…>`; the log stays serializable and replayable (P4).
- Semantic-first: specs describe structure (nodes/edges/relationships), never coordinates.
- SVG is a compiled artifact; the canonical source is the semantic scene (visual ARCHITECTURE §2).
- **Structured relationship list is a first-class L4 output** derived from the same semantic model (SPEC §3.3) — nothing is conveyed by shape/color/layout position alone.

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P5 must be landed and its gate green

P6 is written ahead of P5; it MUST NOT execute until P5 is DONE and its §4 gate is green (PLAN.md §2 "phases are promoted one at a time"). Before any P6 work:

1. `main` posts the P5 merge (`@knowledgeassemble/timeline-engine` full renderer landed); full gate green on `main`:
   `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
2. `docs/PLAN.md` §10 shows P5 `DONE` and §11 has the P5 lines + Timeline-D1…Timeline-D4 (verified — do not re-do).
3. Confirm P6 **diagram** docs state: `docs/engines/diagram/SPEC.md` is **thin (71 lines)** and already says "Proposed (thin — gates P6 implementation; expand in code, not prose)" — the P6 **schema** is authored from it at T1 and the SPEC itself is only bumped to "Normative at P6" as a reviewer-approved T8 edit. `docs/engines/diagram/VISION.md` (Draft, 1420 lines) stays **Frozen** — context only. `docs/schemas/diagram-spec.schema.json` does **not** exist yet — it is authored at T1.
4. Confirm `EngineType` already includes `'diagram'` (`packages/interactive-engine/src/core/engine.ts:8`) and `ACTION_TYPES` already includes `expand`/`collapse`/`follow` — no core change needed.

If anything above is red, stop and fix it first.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p6-diagram-engine
```

Commit per task with repo style (`P6 T<nn>: <one-liner>`). Open a PR against `main`; land with `gh pr merge <n> --merge --delete-branch`. `main` is PR-protected — no direct pushes.

### 1.3 Grounded current state (verify on disk before writing code)

| Asset | Location | Status |
|---|---|---|
| Diagram normative spec | `docs/engines/diagram/SPEC.md` | Thin (71 lines). MVP `kind`/`profile`: `flow \| cycle \| hierarchy \| concept-map`; `layout.type` semantic; namespaced events; §3 P6 slice; §4 causality non-goal |
| Diagram vision | `docs/engines/diagram/VISION.md` | Draft 0.1 — **Frozen**; context only at P6 |
| Diagram JSON schema | `docs/schemas/diagram-spec.schema.json` | **Missing — authored at T1** (mirror `visual-spec.schema.json` conventions) |
| Core public surface | `packages/interactive-engine/src/index.ts` | `Engine`/`EngineRegistry`, `runPipeline`/`ValidationResult`, `validateEnvelope`, `EventLog`, `baseReducer`/`initialState`, `EngineError`/`ERROR_CODES`, `ACTION_TYPES` (incl. `expand`/`collapse`/`follow`), `A11yNode`/`a11yTreeOf`, `EngineHost` |
| Pipeline template | `packages/visual-engine/`, `packages/chart-engine/`, `packages/geomap-engine/` (post-P4), `packages/timeline-engine/` (post-P5) | `schema.ts`/`schemas/*.json`/`scene`/`layout`/`render`/`validation`/`engine.ts` + `fixture/…` + `e2e/*.spec.ts` — mirror this shape |
| Conformance app | `apps/conformance/src/main.ts` + `{visual,composition,chart,geomap,timeline}.ts` | add `?engine=diagram`; `window.__diagramHarness` |
| Engine e2e home | `packages/*/e2e/*.spec.ts` | engine-package convention — diagram e2e lives in `packages/diagram-engine/e2e/` |
| Agent skill convention | `docs/engines/<engine>/skills/<name>/SKILL.md` | diagram home mirrors |

### 1.4 Decision gates to close at T0 (record in `docs/PLAN.md` §11 change log before implementing)

- **Diagram-D1 — Closed structural model.** `content.kind` is a **closed enum `["flow","cycle","hierarchy","concept-map"]`** (SPEC §2 out of the box); `content.profile` optional, closed enum `["process","system","concept","cause-effect"]` (semantic band only — no structural behavior at P6, documented as such). `label-diagram` (image + anchored labels) is future. If a reviewer wants a fifth kind, it is a plan note + schema bump — never a silent widening.
- **Diagram-D2 — Deterministic auto-layout, provenance-marked.** `layout.type` at the **envelope root** (SPEC §2 restates it there — mirror the SPEC, not a `content` slot) is a **closed enum `["radial","hierarchical","grid"]`** (the envelope's shared `LayoutSchema` already carries exactly this enum — no new value) with a fixed default per kind: `cycle→radial`, `flow|hierarchy→hierarchical`, `concept-map→grid`. All three strategies are hand-written pure functions over the stable node/edge order — no d3, no force. Every laid-out position is stamped **`positionSource: 'illustrative'`** (DESIGN §9, SPEC §2): layout coordinates are teaching aids, never measured truth. If an author ever pins real positions it requires a documented `layout` provenance escape in the SPEC — OUT of P6 scope.
- **Diagram-D3 — Cycle semantics per kind.** `detectCycles` (deterministic, stable) drives both validation and layout: `flow`/`hierarchy` MUST be acyclic → any directed cycle is `INVALID_ENTITY` (semantic contradiction); `cycle` kind MUST contain ≥ 1 directed cycle → acyclic `cycle` spec is `INVALID_ENTITY`; `concept-map` MAY contain cycles (grid layout handles them). Cycle members are surfaced in the relationship-list alternative so learners see them.
- **Diagram-D4 — Namespaced result events.** `select` of a node → `diagram.node-selected`; `focus` → `diagram.node-focused`; `follow` of an edge → `diagram.relationship-followed` (SPEC §2). All payloads carry the **full node/edge record** (+ `links` on nodes) — mirroring chart/timeline conventions so composition can resolve `targetIdFrom` off `links.*`. `expand`/`collapse` are D5 `baseReducer` state operations (sub-graph visibility) and emit no bespoke namespaced event.
- **Diagram-D5 — Authored edge ids; `follow` targets them.** Edges carry an **optional** `id` (id-pattern, unique) in the spec; the scene edge id is the authored id when present, else the deterministic compound `edge-<from>-<to>` (derived, documented). A `follow` with `target.id` MUST resolve to an edge id as authored-or-derived (`INVALID_ENTITY` otherwise) — the engine never invents an edge from adjacency. Edges whose `relationship` is composed of `contains`/`part-of` form the sub-graph tree that `expand`/`collapse` operate on.

---

## 2. The Diagram specification contract (author this first)

Author `docs/schemas/diagram-spec.schema.json` (canonical) + Zod mirror in `packages/diagram-engine/src/schema.ts`, from Diagram SPEC §2 restated in the shared envelope (D1 — no `{ "diagram": {} }` wrapper, no `schemaVersion`). Target content shape:

```jsonc
{
  "type": "diagram",                        // envelope; L1 via interactive-engine.schema.json
  "version": "1.0.0",
  "id": "water-cycle",
  "metadata": { "title": "Water cycle" },
  "purpose": { "learningObjective": "Understand how water moves through the cycle", "reasoningMode": "explore" },
  "content": {
    "kind": "cycle",                        // closed enum ["flow","cycle","hierarchy","concept-map"] (Diagram-D1)
    "profile": "process",                   // optional, closed enum ["process","system","concept","cause-effect"] (Diagram-D1)
    "nodes": [
      { "id": "evaporation", "label": "Evaporation", "description": "Liquid becomes vapour",
        "links": { "visualEntityId": "water-figure" } },      // composition hint (D8), not an import
      { "id": "condensation", "label": "Condensation" },
      { "id": "precipitation", "label": "Precipitation" },
      { "id": "collection", "label": "Collection" }
    ],
    "edges": [
      { "from": "evaporation", "to": "condensation", "relationship": "leads-to" },
      { "from": "condensation", "to": "precipitation", "relationship": "leads-to" },
      { "from": "precipitation", "to": "collection", "relationship": "leads-to" },
      { "from": "collection", "to": "evaporation", "relationship": "leads-to" }
    ]
  },
  "layout": { "type": "radial" },         // envelope root (SPEC §2), optional closed enum (Diagram-D2); default derives from kind
  "interaction": { "mode": "explore",
    "actions": ["select", "deselect", "focus", "expand", "collapse", "follow", "reset"] },
  "questions": [],
  "sources": [{ "class": "authoritative" }],   // provenance (DESIGN §9)
  "accessibility": { "label": "Water cycle diagram: evaporation, condensation, precipitation, collection." }
}
```

Rules to encode in the schema + Zod (`additionalProperties:false` at every level):

1. `content.kind` — closed enum `["flow","cycle","hierarchy","concept-map"]` (Diagram-D1), required; unknown kind → `INVALID_ENTITY` at L2 (schema constrains the enum; semantics decide compatibility).
2. `content.profile` — optional closed enum `["process","system","concept","cause-effect"]` (Diagram-D1); metadata-only at P6 (no structural behavior) — recorded in the schema `description`.
3. `nodes[]` — `{ id (id-pattern, unique), label (non-empty), description?, links?: Record<string,string> }`. ≥ 1 node; duplicate ids → `INVALID_ENTITY`.
4. `edges[]` — `{ id? (id-pattern, unique), from (node id), to (node id), relationship (closed enum — REQUIRED; SPEC §2 "first-class") }`. `relationship` is **explicit**: the engine never infers it from adjacency or position (SPEC §4). Closed `relationship` enum at P6: `["leads-to","part-of","contains","is-a","connected-to","influences"]` (Diagram-D5 — documented; no temporal `before`/`after`, those belong to Timeline; no `causes` beyond `leads-to`).
5. Edge refs — `from`/`to` MUST reference declared node ids (`INVALID_REFERENCE` at L2); self-loop → `INVALID_ENTITY`; duplicate `(from,to,relationship)` triple → `INVALID_ENTITY`; edge ids (when authored) unique → `INVALID_ENTITY`. Edge id resolution: authored `id` when present, else deterministic compound `edge-<from>-<to>` (Diagram-D5).
6. `layout.type` — envelope-root optional closed enum `["radial","hierarchical","grid"]` (Diagram-D2; matches the shared `LayoutSchema` enum); absent → deterministic kind-derived default. Coordinates/positions are NEVER authored — `layout` is a strategy selector, not geometry.
7. Provenance (DESIGN §9): nodes/edges/relationships come from content; envelope `sources[].class` ∈ `{authoritative,illustrative,simulated}`; auto-layout positions are stamped `illustrative` (SPEC §2) and surfaced as such.
8. Semantic-first: no `x`/`y`/`width`/`color` values at the spec surface; style accents reference host tokens (nothing by color alone, L4).
9. **`expand`/`collapse` are hierarchy-only.** The sub-graph tree they operate on is defined by `relationship ∈ {contains, part-of}` (a node's children = targets of its outgoing `contains`/`part-of` edges). In a `flow`/`cycle`/`concept-map` spec those two relationships are valid edges but do NOT make nodes expandable — `expand`/`collapse` on a node without a `contains`/`part-of` subtree is a no-op (never an error, so composed specs stay valid). Diagram-D5.

Because P1 core already runs L1 on the envelope, `DiagramEngine.validate` reuses `runPipeline` and supplies its own **L2 semantic** (with the structural/graph tier folded in — no separate named hook), **L3 layout**, **L4 accessibility** hooks (mirroring `chart-engine`; the structural tier is the SPEC §2 graph laws).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prereqs, decision-gating, diagram docs freeze
- Reconcile §1.1 (P5 landed; gate green). Branch per §1.2.
- Record Diagram-D1…Diagram-D4 (§1.4) in `docs/PLAN.md` §11 change log before implementation.
- Confirm SPEC stays the thin normative reference (status bump "Normative at P6" ONLY as a reviewer-approved T8 follow-up; otherwise leave as-is). Do NOT expand `VISION.md` prose; do NOT port vision notions (freeform canvases, bendable arrows, animated connections) into the schema.

**Done when:** PLAN.md §11 has the four D6 decision lines; branch `feat/p6-diagram-engine` exists; `pnpm -w test` is green on the branch base.

### T1 — Diagram-engine scaffold + schema + parity guardrail
- Create the package tree (mirror §1.3 pipeline template):

```text
packages/diagram-engine/
  package.json                 # name: @knowledgeassemble/diagram-engine; deps: interactive-engine + zod only
  tsconfig.json                # extends ../../tsconfig.base.json
  vitest.config.ts
  playwright.config.ts         # testDir ./e2e; webServer: pnpm --filter @knowledgeassemble/conformance dev (port 5173)
  src/
    index.ts                   # public exports (types + functions only)
    schema.ts                  # DIAGRAM_KINDS / PROFILES / RELATIONSHIPS / LAYOUT_TYPES consts + DiagramSpecs Zod + types
    schemas/diagram-spec.schema.json   # canonical (authored here; also copy to docs/schemas/)
    scene/types.ts, scene/build.ts
    layout/graph.ts, layout/hierarchical.ts, layout/radial.ts, layout/grid.ts, layout/engine.ts
    render/types.ts, render/svg.ts
    validation/semantic.ts (calls structural.ts internally), validation/structural.ts, validation/layout.ts, validation/accessibility.ts
    engine.ts                  # DiagramEngine implements core Engine
  test/
    schema-parity.test.ts      # §5 guardrail
    schema.test.ts, scene.test.ts, graph.test.ts, hierarchical.test.ts, radial.test.ts, grid.test.ts,
    layout.test.ts, render-svg.test.ts, validation.test.ts, instance.test.ts
  e2e/diagram.spec.ts          # Playwright (T7)
  fixture/{flow,cycle,hierarchy,concept-map}/ + fixture/water-cycle/   # golden fixtures (T7)
```

- `package.json` scripts identical to the other engines (`typecheck`, `lint` `eslint src test`, `test` `vitest run`, `playwright`). `pnpm install` links the workspace.
- Author `schemas/diagram-spec.schema.json` (canonical) per §2. Mirror in `src/schema.ts` with `z` (`.strict()` everywhere). Export `DIAGRAM_KINDS`/`PROFILES`/`RELATIONSHIPS`/`LAYOUT_TYPES` consts.
- **Parity guardrail** (`test/schema-parity.test.ts`): `content.kind.enum` (sorted) === `DIAGRAM_KINDS` (sorted) === `["concept-map","cycle","flow","hierarchy"]`; `profile` enum === `PROFILES`; `edges[].relationship` enum === `RELATIONSHIPS`; `layout.type` enum === `LAYOUT_TYPES`; `content`/`nodes[]`/`edges[]`/`layout` `additionalProperties === false`; no `makeItPretty|svgMagic|x|y|position|width|height` in the content surface.

**Done when:** `pnpm --filter @knowledgeassemble/diagram-engine typecheck` green with `.js` specifiers; parity test green; the SPEC §2 example parses; `content.kind:"organogram"`, `layout.type:"force"`, and an unknown `content` key all fail; an edge with no `relationship` fails (schema).

### T2 — Scene model + node/edge scene builder
Files: `scene/types.ts`, `scene/build.ts`.

- `scene/types.ts` — Diagram `SemanticRole`: `'diagram' | 'node' | 'edge' | 'arrow' | 'label' | 'relationship-label' | 'group' | 'selectable'`. `SceneNode`/`Scene` reuse the chart conventions (`bounds?` set by layout, `acceptsActions?: ActionType[]`, `interactive?`, `edgeRef?`, `children[]`).
- `scene/build.ts` — `buildScene(content): Scene`:
  - Emit one `node` node per `content.nodes[]` entry: `id: node-<id>`, `role:'selectable'`, `interactive:true`, `acceptsActions:['select','focus','expand','collapse']` (expand/collapse on composite nodes — a node with no children COLLAPSES to non-interactive for those two), metadata `{ nodeId, label, description?, links? }`.
  - Emit one `edge` node per `content.edges[]` entry: `id: edge-<from>-<to>`, `role:'selectable'`, `interactive:true`, `acceptsActions:['follow']`, metadata `{ fromNodeId, toNodeId, relationship, labels }`.
  - Emit a `group` root (`role:'diagram'`) + stable walk order (nodes then edges, in content order); axis/legend placeholders if the layout needs them.
  - Keep scene building **pure**: no layout, no bounds — and let cycle detection happen in T5 (or here); at minimum the builder never throws on well-formed data and never produces duplicate ids.
- Deterministic ids (`node-<id>`, `edge-<from>-<to>`), unique; WHY not the raw id? — selection targets keep the authored node id (`dispatch({type:'select', target:{id:'evaporation'}})` targets `content.nodes[].id`); translate via metadata at render.

**Done when (test-first):** the SPEC §2 cycle example yields 4 node + 4 edge scene nodes with correct metadata; a flow example's edges reference only declared nodes; duplicate edge triple / self-loop → caught (here or T5); duplicate `node-` ids impossible by construction; scene walk order is stable.

### T3 — Deterministic graph analysis + layout engine
Files: `layout/graph.ts`, `layout/hierarchical.ts`, `layout/radial.ts`, `layout/grid.ts`, `layout/engine.ts`.

- `graph.ts` — pure, no d3:
  - `adjacency(nodes, edges)` (stable by edge order), `kahnTopoSort` (deterministic: stable frontier by node id), `detectCycles` → SCC-based `{ cycles: string[][]; hasCycle: boolean }` (deterministic cycle representatives).
- `hierarchical.ts` — longues-path layering over the DAG (flow/hierarchy; concept-map on SCC-condensed graph) → `layer = 0..n`, within-layer stable order by node id → x = colWidth×index, y = layerHeight×layer (deterministic; centered). Implements the `layout.type: "hierarchical"` envelope value.
- `radial.ts` — for `cycle` kind: nodes placed on concentric rings by cycle position/depth (deterministic starting angle at 0, increasing by `2π/n`), edges drawn as chords/arcs with a fixed control-point rule (no force).
- `grid.ts` — concept-map: row-major placement by stable id order (deterministic), cell pitch from tokens; cross-links routed with a fixed orthogonal/curve rule.
- `layout/engine.ts` — `layout(scene, ctx): Scene` where `ctx` from `EngineHost.tokens`. Assigns `bounds` to every node/edge; interactive targets sized ≥ `minTouchTarget`; label placement derived (collision = deterministic offset rule); **every laid-out position stamped `positionSource: 'illustrative'`** (SPEC §2, DESIGN §9). Pure: identical input → identical bounds.

**Done when (test-first):** `kahnTopoSort` on the water-cycle edge set detects the cycle and reports it; a flow DAG lays into ordered layers with stable within-layer order; `radial` places the cycle nodes on a circle with deterministic starting angle; `grid` is row-major stable; determinism test (two identical calls byte-equal bounds); all positions carry `positionSource: 'illustrative'`.

### T4 — SVG renderer + a11y tree + relationship-list alternative + interaction map
Files: `render/types.ts`, `render/svg.ts`.

- `svgFrom(scene, ctx): { svg: string; a11y: A11yNode[]; interactive: Array<{ id: string; action: ActionType }>; alternative: RelRow[] }`.
  - Semantic SVG: `<svg>` with `<title>`/`<desc>` from envelope `accessibility`; `<g id="diagram-root">`, `<g id="diagram-edges">`, `<g id="diagram-nodes">`, `<g id="diagram-labels">`; edges → `<path>`/`<line>` with arrowhead marker + `data-oedu-relationship`; nodes → `<rect>`/<circle alternative per kind> with `id`, `data-oedu-role`, deterministic attribute order and node order (scene walk order). Figures drawn with token-derived styling only.
  - **Security:** whitelisted attributes only; no `<script>`, `on*`, `javascript:`. **Determinism:** two runs byte-identical.
  - `a11y`: reuse core `A11yNode`; one node per node with non-empty label (label + optional description) and one per edge (`<from.label> <relationship> <to.label>`); keyboard order `diagram → nodes → edges → legend`. Include the `positionSource: 'illustrative'` note (via host locale) in the a11y tree/alt so users know positions are illustrative — never presented as measured truth.
  - `alternative`: `RelRow[]` from the **same** scene/data — every edge as `{ from, relationship, to, fromLabel, toLabel }` plus a node roster `{ id, label, description?, kind, profile }` plus cycle members list when `detectCycles` found any (the SPEC §3.3 structured relationship list). Conformance renders it as an accessible `<table>`/list.
  - `interactive`: nodes → `select`/`focus`/`expand`/`collapse`, edges → `follow`.

**Done when:** golden `expected.svg` for the water-cycle fixture is generated and stable across two runs (determinism test); no `onclick`/`<script>`; `a11y` has labeled nodes for every node AND every edge; `alternative` lists all nodes, all edges with explicit `relationship`, and the detected cycles; `interactive` maps each node/edge to the right D5 actions.

### T5 — Diagram validator (L2 semantic incl. structural/graph tier / L3 / L4 hooks)
Files: `validation/semantic.ts` (calls structural tier internally), `validation/structural.ts`, `validation/layout.ts`, `validation/accessibility.ts` → plugged into core `runPipeline`.

- **L2 semantic** — `content.kind` ∈ `DIAGRAM_KINDS` (`INVALID_ENTITY`); `profile` ∈ `PROFILES` (`INVALID_ENTITY`); node ids valid + unique (`INVALID_ENTITY`); edge refs resolve (`INVALID_REFERENCE`); edge ids (when authored) unique (`INVALID_ENTITY`); `relationship` ∈ `RELATIONSHIPS` (`INVALID_ENTITY` — REQUIRED, never inferred); self-loop → `INVALID_ENTITY`; duplicate edge triple → `INVALID_ENTITY`; `acceptsActions` ⊆ D5 (`INVALID_ACTION`); provenance `sources[].class` valid (`INVALID_SPEC`).
- **L2 semantic — structural/graph tier (internal to the semantic hook, not a separate named hook):** `flow`/`hierarchy` acyclic (`detectCycles` → `INVALID_ENTITY`); `cycle` kind contains ≥ 1 directed cycle (acyclic → `INVALID_ENTITY`); `concept-map` cycles allowed. `expand`/`collapse` sub-graph tree defined by `relationship ∈ {contains, part-of}`; expand/collapse on a node without such edges is a no-op. Deterministic, stable, tested.
- **L3 layout** — after `layout(scene)`: all node/edge geometry inside canvas; no required-region overlap; interactive targets ≥ `minTouchTarget` (`INVALID_STATE`/`ACCESSIBILITY_ERROR` on hard failure, warning otherwise).
- **L4 accessibility** — envelope `accessibility.label` present; every node AND every edge labeled; no color-only meaning; `alternative` covers all nodes + edges + detected cycles.
- Hooks return `ValidationResult` and plug into `runPipeline(spec, { semantic, layout, accessibility })` — `ValidationHooks` has exactly those three slots; the structural tier runs inside the `semantic` hook.

**Done when (test-first):** SPEC §2 cycle fixture → `valid:true, issues:[]`; a 2-node 1-edge acyclic `flow` spec → valid; that same graph under `kind:"cycle"` fails `INVALID_ENTITY`; a `flow` with a back-edge fails `INVALID_ENTITY`; an edge `from` unknown node fails `INVALID_REFERENCE`; an edge without `relationship` fails at schema; a color-only node / out-of-canvas layout fails L4/L3.

### T6 — DiagramEngine facade + registry + namespaced events + traversal reducer
Files: `engine.ts` (+ `test/instance.test.ts` registering in the core `EngineRegistry`).

- `DiagramEngine implements Engine` (`type:'diagram'`): `validate(spec)` = `runPipeline` with the T5 hooks; `instantiate(spec, host, id?)` — validate (throw `INVALID_SPEC` on failure), `buildScene` → `layout` → `render`, wrap in an `EngineInstance` whose `dispatch` extends `baseReducer`:
  - `select`/`focus` of a node id → `diagram.node-selected` / `diagram.node-focused` with `data` = **full node record** (+ `links`) — Diagram-D4.
  - `follow` of an edge id → `diagram.relationship-followed` with `data` = **full edge record** (`{from,to,relationship}`) — Diagram-D4.
  - `expand`/`collapse` → `baseReducer` visibility state on a node subtree (computed from reversed adjacency; deterministic); `reset`/`deselect` via `baseReducer` only.
- `snapshot()` returns `EngineState` + read-only `scene`, `svgResult`, `alternative` (deterministically derived). Wire `EngineHost.tokens → LayoutContext`, `Host.locale → text resolution`. Emission order mirrors the other engines (`engine-mounted`, `engine-ready`, `interaction-started`, `state-changed`, namespaced event, `interaction-completed`).
- Import **only** the core public surface (`index.ts`); `.js` specifiers.

**Done when (test-first):** registry `get('diagram')` returns the engine; `instantiate(§2 spec)` → `dispatch({type:'select', target:{id:'evaporation'}})` → `snapshot().selection` contains `evaporation` AND `diagram.node-selected` carries the full node record with `links` when present; `follow` of `edge-collection-evaporation` → `diagram.relationship-followed` with `{relationship:'leads-to'}`; `expand`/`collapse` flip subtree visibility deterministically; `kind:"organogram"` fails `validate`; event ids `<instanceId>:<seq>`.

### T7 — Golden fixtures + conformance tab + browser e2e
- Golden fixtures (`fixture/{flow,cycle,hierarchy,concept-map}/` minimal per-kind slices + `fixture/water-cycle/` integrated slice used by conformance): `input.diagram.json`, `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.alternative.json`, `validation.json`, fixture `README.md`. Asserted by snapshot tests (deterministic; re-running tests does not mutate them). `expected.scene.json` asserts `positionSource:'illustrative'` on every laid-out node (PLAN exit criterion 1 provenance evidence).
- Conformance `?engine=diagram`: `apps/conformance/src/diagram.ts` mirroring the chart/geomap route — register `DiagramEngine`, load the water-cycle fixture, inject `svgFrom(...)` SVG into the DOM, render `alternative` as a real accessible `<table>` with `aria-label`, expose `window.__diagramHarness = { dispatch, snapshot, events, svg, alternative, tryCreate }`; route wiring in `apps/conformance/src/main.ts`.
- `e2e/diagram.spec.ts` (Playwright):
  1. **a11y** — SVG has `<title>`/`desc`; every node AND every edge has a non-empty `aria-label`; the `alternative` table lists all nodes, all edges with explicit `relationship`, and detected cycles (nothing color-only).
  2. **interaction** — keyboard/pointer activation of a node dispatches `select`; snapshot selection contains the node id; `diagram.node-selected` recorded with the full node.
  3. **follow/expand** — `follow` an edge → `diagram.relationship-followed` with the edge record; `expand`/`collapse` a node flips subtree visibility in snapshot.
  4. **replay** — events replay in `seq` order via core `EventLog` (monotonic; determinism).
  5. **data fidelity / cycle laws** — `tryCreate` of a `flow` with a back-edge fails `INVALID_ENTITY`; a `cycle` kind with no cycle fails; an edge referencing an unknown node fails.
  6. **rejection** — `content.kind:"organogram"`, `layout.type:"force"`, an unknown `content` key, and an edge without `relationship` fail `tryCreate`.

**Done when:** all six specs green in a real browser against installed `diagram-engine` + `interactive-engine`.

### T8 — Agent skill + doc reconciliation + full exit gate
- Agent skill `docs/engines/diagram/skills/structural-diagram/SKILL.md` (mirror the chart/geomap skill homes) — when to use Diagram vs Visual vs Chart vs Timeline; closed kinds (`flow|cycle|hierarchy|concept-map`); nodes/edges shape; `relationship` REQUIRED and explicit (never infer causality); `layout.type` strategy selector (radial/hierarchical/grid); positions are auto-layout and `illustrative` (never author pixels); cycle laws per kind; namespaced events + `follow`; relationship-list alternative; validate.
- Bounded proof: the skill's canonical example JSON is checked in (e.g. `docs/fixtures/diagram/skill-example.json`) and round-trips `DiagramEngine.validate` valid in a unit test.
- `docs/fixtures/diagram/README.md`: validation commands (`diagram-spec.schema.json` L1 + embedded `interactive-engine.schema.json` L1 env + L2–L4 via `DiagramEngine.validate`) and the "no invented edges/relationships; no explicit-causality-without-relationship" rule.
- `docs/PLAN.md` §10 status board `P6 → DONE` **only after** the §4 gate is green; add §11 change-log lines (P6 DONE + the four D6 decisions). Flip `diagram/SPEC.md` status per T0 decision.

**Done when:** full exit gate green (§4); PLAN.md status board + change log consistent.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P6 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Nodes/edges slice green with deterministic auto-layout and provenance on generated positions | T3 determinism/bounds tests + T4 golden `expected.{svg,scene,a11y}.json` with `positionSource:'illustrative'` on every laid-out node + T7 e2e specs (a11y, interaction, follow/expand, replay) |
| 2 | L1-L4 conformance pass | T5 validator (positive + negative) + T7 `e2e/diagram.spec.ts` + conformance `?engine=diagram` `window.__diagramHarness`; full gate commands green |

**Self-checks (all MUST pass, not just the two PLAN criteria):**
- **No engine smuggling (D9):** `grep -rn "from '@knowledgeassemble/\|@open-edu/" packages/diagram-engine/src` yields only `interactive-engine`; no `visual-engine|chart-engine|geomap-engine|timeline-engine` imports; no visual kinds; no `label-diagram|x` in src except negative-test strings.
- **Closed structural model:** `grep -rn "organogram\|flowchart\|uml\|mindmap" packages/diagram-engine/src/schemas/diagram-spec.schema.json` → only `description` text, never the `kind`/`profile` enums; `DIAGRAM_KINDS`/`RELATIONSHIPS`/`LAYOUT_TYPES` exact-match Diagram-D1/Diagram-D2.
- **Deps:** `packages/diagram-engine/package.json` deps = `interactive-engine` + `zod`; no d3/dagre/graphlib/cytoscape.
- **Determinism:** two-run byte identical `expected.svg` test green; `grep -rn "Date.now\|Math.random\|performance.now\|forceCenter\|forceSimulation\|d3-" packages/diagram-engine/src` → empty.
- **Shared error codes only:** thrown codes ⊆ §67 set (`grep -rn "'[A-Z_]*ERROR'\|'INVALID_'" packages/diagram-engine/src`).
- **Semantic-first + causality discipline:** no `x`/`y`/`position`/`pixel` authored in specs; `grep` of every fixture `input.diagram.json` surfaces no geometry keys and **every edge has an explicit `relationship`** (no adjacency-inferred meaning).
- **Provenance on positions:** every laid-out scene node carries `positionSource:'illustrative'` — asserted by the T7 golden `expected.scene.json`.
- **D6:** no store/i18n/studio/scoring modules; `questions` stay empty arrays in fixtures.

---

## 5. Schema ↔ Zod parity guardrail (T1 must include)

`test/schema-parity.test.ts` (diagram) asserts the canonical JSON Schema and the runtime Zod mirror stay in sync, per T1 §3 list — plus:
- `DIAGRAM_KINDS`/`PROFILES`/`RELATIONSHIPS`/`LAYOUT_TYPES` (sorted) === the schema enum values (sorted).
- `content`/`nodes[]`/`edges[]`/`layout` `additionalProperties === false`; `edges[].relationship` required (schema-level — `ref`/required enforcement parity across both).
- the SVG/a11y/alternative reciprocity: every node AND every edge appears in the a11y tree AND in `alternative` (parity between `render` map, `a11y`, and the relationship-list derivation).
- every fixture `input.diagram.json` for all four kinds round-trips `DiagramEngine.validate` valid, and its `expected.*` files are byte-stable.

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not put React/DOM in `packages/diagram-engine`.** SVG is pure data; the relationship-list `<table>` is built in the conformance app, not the engine.
2. **Do not import peer engines or OpenEdu** (D2/§6). Only `@knowledgeassemble/interactive-engine` public surface + `zod`.
3. **Do not build Visual/Chart/GeoMap/Timeline behavior, or a `label-diagram` kind** (D9 + Diagram-D1). A `kind` outside `["flow","cycle","hierarchy","concept-map"]` is a contract violation — reject in review.
4. **Do not reach for d3/dagre/cytoscape/graphlib.** Graph algorithms are hand-written pure functions; determinism (P4) is tested and a golden change requires fixture review. No force-directed layout, ever.
5. **Do not infer relationships or causality.** `relationship` is REQUIRED on every edge and never inferred from adjacency (SPEC §4). No temporal `before`/`after` semantics (Timeline owns that).
6. **Do not author geometry or pass off positions as truth.** No `x`/`y`/`position`/pixels in specs; layout is derived and every position is `illustrative` (Diagram-D2, SPEC §2). No LLM-pleaser props.
7. **Do not emit unsafe SVG.** Whitelist attributes; never `on*`, `<script>`, `javascript:`.
8. **Do not use wall-clock/time/randomness anywhere** (P4). Determinism is tested with byte-identical fixtures.
9. **Use exactly the §67 codes** — bad kind/profile/label → `INVALID_ENTITY`; unresolved node ref → `INVALID_REFERENCE`; cycle-law violation → `INVALID_ENTITY`; bad action → `INVALID_ACTION`; layout infeasibility → `INVALID_STATE`; a11y gap → `ACCESSIBILITY_ERROR`.
10. **Namespaced events only.** `select` → `diagram.node-selected`; `focus` → `diagram.node-focused`; `follow` → `diagram.relationship-followed`; payloads = full node/edge record (+ `links` on nodes). `expand`/`collapse` are D5 `baseReducer` state operations with NO bespoke namespaced event — do not invent per-entity event names.
11. **`.js` import specifiers + `src/index.ts` as the only public surface** of `diagram-engine`; deep imports into `interactive-engine` internals are forbidden (NodeNext).
12. **Test-first.** Every task T1–T7 starts with its failing test/fixture; "done" means that test passes (convention).
13. **Reuse, don't reimplement the event system.** Use core `baseReducer`/`EventLog`; diagram extends `baseReducer` for its three namespaced result events only.
14. **Cycle detection is dual-purpose.** It feeds BOTH validation (flow/hierarchy acyclicity, cycle-kind presence) AND layout (radial rings). Implement it ONCE in `layout/graph.ts` and let the validator consume it — no duplicated detection logic.

---

## 7. Definition of Done (P6-specific)

P6 is complete when:

- `docs/PLAN.md` §4 P6 exit criteria 1–2 are green, verified by the §4 gate commands (not assertion).
- `packages/diagram-engine` passes `typecheck`, `lint`, unit tests, and browser e2e.
- `diagram-spec.schema.json` (1.0.0) is canonical and mirrored in Zod with the §5 parity guardrail green.
- The nodes/edges/auto-layout slice has byte-stable golden fixtures (`input.diagram.json`, `expected.{svg,scene,a11y,alternative}.json`, `validation.json`) checked in.
- All four kinds (flow/cycle/hierarchy/concept-map) round-trip validation; cycle laws enforced per kind; every laid-out position is `positionSource:'illustrative'`.
- Conformance `?engine=diagram` works (SVG + accessible relationship-list `<table>`); the structural-diagram skill example round-trips validation.
- `docs/PLAN.md` marks P6 **DONE**, logs the change (including Diagram-D1…Diagram-D4), and the diagram SPEC/VISION statuses match the T0 decision. P6 is the last engine phase — P7 (OpenEdu integration) is the next and final gate.

Do **not** start P7 until the §4 gate is green.