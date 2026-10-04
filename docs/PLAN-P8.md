# Phase 8 — Production readiness

**File:** `docs/PLAN-P8.md`
**Status:** Proposed (post-P7; expands `docs/PLAN.md` §4 P8)
**Audience:** AI coding agents and engineers taking the P0–P7 slices to a learner-ready product
**Do this first:** read, in order — `docs/PLAN.md` (§4 P0–P7, §5 lifecycle, §7 definition of done), this file, `docs/p7-acceptance.md` (OpenEdu-repo items), engine `PLAN-P2.md`–`PLAN-P6.md` only for the **slice contracts** they already specified (do not re-open frozen kind enums). These are normative; this file is the how.

There is no `PLAN-P0.md`; P0 lives in `PLAN.md` §4.

---

## 0. Goal and non-goals

**Goal.** Treat P0–P7 **DONE** as *in-repo phase gates* (thin vertical slices + host simulation), not as a production product. Close the rest of the lifecycle in `PLAN.md` §5:

```text
Renderer(SVG) that matches the slice SPEC → Playground honesty → published packages → OpenEdu proof
```

**What P0–P7 already delivered (do not rebuild).** Envelope, core runtime, five engine packages on closed MVP kinds, composition (P2.5), `interactive-react` seam, in-repo `?engine=lesson` simulation, ADRs drafted here, playground *app* (`docs/PLAN-PLAYGROUND.md`).

**Non-goals (hard). Do NOT:**

- Start Simulation / Equation / 3D engines (PLAN.md §6, §9).
- Build a second OpenEdu (Studio, scoring, telemetry store, i18n product, PWA) in this repo (D6).
- Widen frozen `kind` / layer / projection enums to make playground look fuller (DESIGN §15).
- Adopt Recharts, MapLibre, Konva, or a “super library” as the semantic model.
- Introduce D3 / d3-geo / ELK **until Workstream A is green** and a later SPEC slice names the math (P4/P6 explicitly banned those libraries for the MVP determinism gate). **Exception (ADR-10):** the GeoMap engine already ships `d3-geo` as a production dependency for deterministic spherical math (projection constructors `geoEquirectangular`/`geoMercator`/`geoAlbers`, `geoCentroid`, `geoArea`, `geoDistance`), consumed only as pure-math transforms in `layout/projection.ts` and `scene/build.ts`/`scene/derive.ts`. No other D3 (d3-scale/d3-time/DOM), ELK, or library use is permitted; the exception is re-reviewed when Workstream A is green.
- Write a parallel `VISUALIZATION-TECHNOLOGY-STRATEGY.md` that outranks DESIGN/STRUCTURE. Adapter policy stays in STRUCTURE §16–20 + a DESIGN decision if one is recorded later.

**Operating rule.** Own educational semantics, state, events, a11y, composition, and renderer *integration*. Do not hand-build a general charting/GIS/graph-layout product. Borrow commodity math **behind adapters** only when a gated SPEC slice requires it. Empty or stub SVG for entities the slice already claims is **slice debt**, not a reason to add libraries.

---

## 1. Why P8 exists

| Claim | Reality |
|-------|---------|
| PLAN.md §10 P7 DONE | In-repo host **simulation**. Real `CourseRuntime` is `docs/p7-acceptance.md`. |
| PLAN.md §5 Playground per engine | App exists; fixtures were not an honesty gate. |
| PLAN-P6 T4 edges as `<path>`/`<line>` | Task specified it; the P6 gate did not assert visible edges. |
| PLAN.md P2 “then the visual component library” | Number-line was the exit slice; D9 closed set is still incomplete for production. |
| PLAN.md §3 CLI | Named; never delivered (P2/P3 deferred tooling to conformance, then playground). |

P8 does not reopen P0–P7 status. It sequences the remaining **logical** work those plans already implied.

---

## 2. Sequencing (do not skip)

```text
Workstream A  slice honesty (this repo)
      │
      ▼
Workstream B  OpenEdu host proof (OpenEdu repo; can overlap A once A1 is green)
      │
      ▼
Workstream C  publish + host wiring (npm + tokens/a11y from real host)
      │
      ▼
Workstream D  next SPEC slices (area/scatter, extra projections, label-diagram, …)
      │
      ▼
Workstream E  CLI (when authors need it outside playground)
```

Workstream D MUST NOT start until A is green for that engine family.

---

## 3. Workstream A — Slice honesty (this repo)

Finish what PLAN-Px already required for the MVP picture, with tests that fail if the picture is hollow.

> **Status (2026-09-13):** A1 (diagram edges + graph-order layout + edge L3 geometry + goldens + e2e) and A2 (visual D9 kinds with per-kind layout strategies + golden fixtures for all 14 visual fixture dirs) are **landed in `main`**. A3 (chart/timeline goldens) and A4 (render-honesty tests) are **DONE** with a green exit gate on the next-phase plan N1 (`feat/architecture-review-docs`; lands with that PR). Known follow-on: chart `kind: line` renders discrete point markers only — no series stroke — registered in the next-phase plan N1.8.

### A1 — Diagram (first; unblocks playground as a gate)

| ID | Task | Plan source | Status |
|----|------|-------------|--------|
| A1.1 | Edges render as `<line>` or `<path>` with arrowhead; not empty `<g>` | PLAN-P6 T4 | **DONE** (`render/svg.ts` emits `<path d="…" marker-end="url(#arrowhead)"/>`, `<line>`, `data-oedu-relationship`) |
| A1.2 | Layout uses the graph: radial by deterministic cycle/walk order (not sorted ids); hierarchical keeps topo layers; grid uses content or BFS order | PLAN-P6 T3 | **DONE** (per-strategy ordering policy; no `ids.sort()` in ordering paths) |
| A1.3 | Edge geometry assigned in layout; L3 “geometry inside canvas” applies to edges | PLAN-P6 T3/T5 | **DONE** (`layout/engine.ts` produces `edgeGeometry` clamp-checked in canvas) |
| A1.4 | Goldens + e2e assert presence of edge primitives; playground: all diagram fixtures show nodes **and** relationships | PLAN §2, PLAN-P6 T7 | **DONE** (5 fixtures with `expected.{svg,scene,a11y,alternative}.json`; e2e asserts edge rows + relationship + follow) |
| A1.5 | No ELK/Dagre/d3 for A1. Fixtures are small; this is OpenEdu SVG from owned bounds | PLAN-P6 deps rule | **DONE** (no diagram imports of d3/ELK/dagre) |

### A2 — Visual closed set (D9)

Number-line satisfied PLAN.md P2 **exit**. Production still needs PLAN.md P2 item 5 / PLAN-P2 T7: `counting-set`, `fraction-bar`, `fraction-circle`, `clock`, `coordinate-grid`, `geometry-shape`, `comparison` as real scene + accessible SVG + tests (full goldens per kind as claimed). No timeline/flowchart/label-diagram in Visual (D9).

> **Status (2026-09-13):** **DONE on landed `main`** — `layout/engine.ts` has a dedicated strategy per D9 kind + `illustration`; all 14 visual fixture dirs carry `expected.{svg,scene,a11y}.json`; `number-line-identify-marked` (label-target discovery) and `coordinate-grid-practice` (guided) land on the current use-case catalog (`nl-identify-marked`, `cg-plot-point`).

- Visual use-case catalog drives slice honesty; first slice = `nl-identify-marked` + `cg-plot-point`. **DONE.**

### A3 — Playground honesty bar

For every catalog fixture, a human (and a test where practical) sees the slice the SPEC names. After A1, audit Chart → GeoMap → Timeline → Visual the same way: **hollow render** vs **layout bug** vs **harness**. Fix hollow/layout in-engine; do not “fix” with a library.

> **Status (2026-09-13):** **DONE** (next-phase plan N1 on `feat/architecture-review-docs`, gate green; lands with that PR) — Chart `bar`/`line` and Timeline `events`/`independence`/`periods`/`tracks` carry `expected.{scene,svg,a11y}.json`, asserted byte-stable per engine; Timeline fixtures gained `validation.json` parity. Chart `kind: line` is marker-only — tracked follow-on in next-phase plan N1.8.

### A4 — Test bar

A feature in this workstream is done only when a test that would have passed on stub SVG now fails, then passes. Golden SVG updates are reviewed fixture changes (DESIGN §11).

> **Status (2026-09-13):** **DONE** (next-phase plan N1 on `feat/architecture-review-docs`, gate green; lands with that PR) — `render.test.ts` added in chart (bar `<rect>` bars + labeled axes; line point markers; non-hollow) and timeline (period `<rect>` bands; event markers; labeled track lanes; non-overlapping lanes), failing on stub renderers; dev-harness honesty audit (125 tests) green.

**Workstream A exit:** diagram fixtures show structure; Visual D9 kinds claimed in PLAN-P2 T7 have non-stub render tests; playground is an acceptance surface, not a screenshot of empty groups. **Exit is green when A3/A4 above are complete.**

---

## 4. Workstream B — OpenEdu proof (OpenEdu monorepo)

Identical to `docs/p7-acceptance.md`. P8 owns **tracking** that P7 left as cross-repo. Do not implement OpenEdu internals in this repository.

| ID | Item | p7-acceptance |
|----|------|----------------|
| B1 | Learner `CourseRuntime` hosts `InteractiveNode` / `InteractiveLesson` with real tokens, i18n, `onEvent`, `.oep` | #1 |
| B2 | Adopt lesson-node schema into `@open-edu/schemas` | #2 |
| B3 | Real composed-lesson run (Timeline → Visual) with real host services | #6 |
| B4 | Studio emits engine specs + bindings | #3 |
| B5 | Transplant ADR-01…09 into `openedu-way` | #4 |
| B6 | Progressive widget → `{ type: "interactive" }` migration | #5 |
| B7 | Optional Timeline + GeoMap narrative composition | PLAN.md P7 item 6 (not a gate for first proof) |

**Workstream B exit for “in OpenEdu”:** B1 + B2 + B3 green. B4–B6 are authoring/migration; B7 is optional.

---

## 5. Workstream C — Publish and host-quality (this repo + registry)

| ID | Task | Plan source |
|----|------|-------------|
| C1 | Publish `@knowledgeassemble/*` packages (not only `publish:dry` / smoke) | PLAN.md §9.2 OpenEdu-D2; PLAN-P7 T7 |
| C2 | Installed-package conformance remains green on published versions | PLAN.md P7 exit 2 |
| C3 | Token and a11y prefs from a real host (high contrast / reduced motion via `EngineHost`) exercised beyond the stub | PLAN.md §6 |
| C4 | Additional composition fixtures only as needed for B7; do not invent a second composition runtime | P2.5 freeze |

---

## 6. Workstream D — Next SPEC slices (after A, gated)

New `kind`s and projections are **new phase tasks** with T0 decisions in PLAN.md §11. They are not P8 Workstream A.

| Family | Deferred by | Examples |
|--------|-------------|----------|
| Chart | PLAN-P3 Chart-D1 | `area`, `scatter`; then SPEC families |
| GeoMap | PLAN-P4 GeoMap-D1/D2, SPEC §83 | projections beyond `equirectangular`; flow/heatmap/animation/scenes; `d3-geo` only when enum grows |
| Timeline | PLAN-P5 | no engine-side `setInterval` playback; extra kinds out of P5 |
| Diagram | PLAN-P6 Diagram-D1 | `label-diagram`; ELK only behind `LayoutEngine` if a later slice outgrows radial/hierarchical/grid |
| Visual | D9 | equation/measurement/angle **out**; never steal Timeline/Diagram |

When D needs commodity math: isolate behind an adapter; never in JSON; never as the semantic model; goldens stay deterministic (STRUCTURE §16–20).

---

## 7. Workstream E — CLI

PLAN.md §3 and §6: `generate · validate · preview · inspect · components · recipes`. Scaffold was deferred when conformance (then playground) became the demo surface. Schedule after A and after authors need a non-UI workflow. Not a blocker for B1–B3.

---

## 8. Exit gate

P8 is **not** a single `pnpm playwright` flip. Promote substages:

| Substage | Green when |
|----------|------------|
| A | A1–A4 as specified; full in-repo gate still green |
| B-min | p7-acceptance #1, #2, #6 |
| C | packages on npm; smoke against published tarballs |
| D | each slice has its own PLAN task + exit tests |
| E | CLI commands documented and tested |

Update `docs/PLAN.md` §10/§11 when a substage completes — do not mark all of P8 DONE until A + B-min + C1 are green.

---

## 8a. Layout library evaluation (settled — do not reopen)

A hand-rolled radial ring skewed its arrows (the 5-node media cycle rendered arrows of
171/81/132/81/171px, a 2.12 ratio) and the obvious response was to adopt an industry
layout library. Both real candidates were built and measured against the actual failing
fixture rather than judged on reputation.

| Candidate | 5-node cycle result | Verdict |
|-----------|--------------------|---------|
| Hand-rolled ring (baseline) | fits 800x600, arrows 171/81/132/81/171, ratio **2.12** | baseline |
| **Graphviz `circo`** (`@hpcc-js/wasm`) | perfect ring (radius spread 0.0px), fits 800x600 at 653x580, arrows 49/156/49/128/128, ratio **3.16** | 49% worse; 37 MB unpacked WASM + asset loading |
| Graphviz `dot` | 282x768, does not fit, arrows 36/32/32/36/537, ratio **16.64** | rejected |
| Graphviz `twopi` | not a ring (radius spread 192px), ratio ~1055 | rejected |
| **ELK `layered`** (`elkjs`) | 1180x140, does not fit, arrows 20…802, ratio **40.1** | rejected for cycles |
| ELK `radial` | `IllegalArgumentException: The given graph is not a tree!` | rejects cycles outright |
| ELK `stress` / `mrtree` | 8 overlaps / collapses to a 220x680 column | rejected |

Additional costs that would apply even where a library looked competitive:

- `elkjs` is asynchronous, so adopting it forces `layout()` async across diagram-engine,
  interactive-engine, dev-harness's sync `tryCreate`, and the whole Playwright suite.
- `elkjs` is a 1.53 MB bundled dependency and `@hpcc-js/wasm` is 37 MB unpacked with a WASM
  asset. Both conflict with STRUCTURE §40-41 (plain per-file `tsc` ESM emit, engine-level
  tree-shaking).
- No candidate performs canvas fitting. A 12-stage flow came back from ELK at 2140x48, so
  the fitting code in `layout/fit.ts` would stay regardless.

**Decision: no third-party layout dependency.** Layout quality is instead asserted as CI
invariants in `packages/diagram-engine/test/media-layout.test.ts` (no overlap, canvas +
label fit, `NODE_GAP` clearance, centring, determinism, and an arrow-ratio ceiling).

### Why the ring skews, and what actually moves the number

On a ring every centre-to-centre chord is equal, so arrow length is decided entirely by how
much chord each media box absorbs. That inset depends on the chord direction against the
box aspect: a horizontal chord gives up `width`, a vertical one gives up `height`. With a
220x120 slot that is 220 vs 120, hence the 2.12 ratio — and the ratio is invariant to box
size (2.05 at the 120x65 floor), which is why scaling fixes did not help.

The only lever that moves it is equalising the two insets, so radial layouts take **square**
media slots (`RADIAL_BOX_MAX = 170`, falling back to the 11:6 box on canvases too small for
a 120x120 square):

| Canvas | Slot | Arrow ratio |
|--------|------|-------------|
| 1600x1200 | 170x170 | 1.62 |
| 1200x900 | 170x170 | 1.62 |
| 800x600 | 152x152 | 1.56 |
| 700x520 | 125x125 | 1.47 |
| 640x480 | 183x100 (fallback) | 2.11 — known debt |

Grid and hierarchical keep the 11:6 slot; only the ring needs squares.

Not yet exploited: routing every ring edge radially out to a shared outer routing circle and
back would make all arrows identical by symmetry (ratio 1.0) at the cost of a wider footprint
and a new visual idiom. Deliberately out of scope here.

---

## 9. Anti-patterns for this phase

1. Reverse-engineering playground bugs into a new architecture. Map bugs to A1–A4 or to a named Workstream D slice.
2. “Introduce D3 now” to fix stub edges or alphabetical radial order.
3. New published packages (`interactive-svg`, `interactive-data`, …) before a second engine actually shares the code.
4. Expanding Visual VISION/SPEC prose instead of implementing PLAN-P2 T7 kinds.
5. Re-litigating the layout library decision in §8a without new measurements — the table above
   is the evidence, and it covers the two libraries that actually do rings or layered layouts.

---

## 10. Change log

| Date | Change |
|------|--------|
| 2026-09-09 | Initial P8: production-readiness workstreams A–E derived from PLAN.md + PLAN-P1…P7 + p7-acceptance (not from ad-hoc playground archaeology). |
| 2026-10-04 | §8a: evaluated `elkjs` and Graphviz for diagram layout against the failing media cycle; both measured worse than the existing ring, so no layout dependency was added. Radial now uses square media slots (arrow ratio 2.12 → ~1.56) with the ratio asserted as a CI invariant. |
