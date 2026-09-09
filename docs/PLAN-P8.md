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
- Introduce D3 / d3-geo / ELK **until Workstream A is green** and a later SPEC slice names the math (P4/P6 explicitly banned those libraries for the MVP determinism gate).
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

### A1 — Diagram (first; unblocks playground as a gate)

| ID | Task | Plan source |
|----|------|-------------|
| A1.1 | Edges render as `<line>` or `<path>` with arrowhead; not empty `<g>` | PLAN-P6 T4 |
| A1.2 | Layout uses the graph: radial by deterministic cycle/walk order (not sorted ids); hierarchical keeps topo layers; grid uses content or BFS order | PLAN-P6 T3 |
| A1.3 | Edge geometry assigned in layout; L3 “geometry inside canvas” applies to edges | PLAN-P6 T3/T5 |
| A1.4 | Goldens + e2e assert presence of edge primitives; playground: all diagram fixtures show nodes **and** relationships | PLAN §2, PLAN-P6 T7 |
| A1.5 | No ELK/Dagre/d3 for A1. Fixtures are small; this is OpenEdu SVG from owned bounds | PLAN-P6 deps rule |

### A2 — Visual closed set (D9)

Number-line satisfied PLAN.md P2 **exit**. Production still needs PLAN.md P2 item 5 / PLAN-P2 T7: `counting-set`, `fraction-bar`, `fraction-circle`, `clock`, `coordinate-grid`, `geometry-shape`, `comparison` as real scene + accessible SVG + tests (full goldens per kind as claimed). No timeline/flowchart/label-diagram in Visual (D9).

### A3 — Playground honesty bar

For every catalog fixture, a human (and a test where practical) sees the slice the SPEC names. After A1, audit Chart → GeoMap → Timeline → Visual the same way: **hollow render** vs **layout bug** vs **harness**. Fix hollow/layout in-engine; do not “fix” with a library.

### A4 — Test bar

A feature in this workstream is done only when a test that would have passed on stub SVG now fails, then passes. Golden SVG updates are reviewed fixture changes (DESIGN §11).

**Workstream A exit:** diagram fixtures show structure; Visual D9 kinds claimed in PLAN-P2 T7 have non-stub render tests; playground is an acceptance surface, not a screenshot of empty groups.

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

## 9. Anti-patterns for this phase

1. Reverse-engineering playground bugs into a new architecture. Map bugs to A1–A4 or to a named Workstream D slice.
2. “Introduce D3 now” to fix stub edges or alphabetical radial order.
3. New published packages (`interactive-svg`, `interactive-data`, …) before a second engine actually shares the code.
4. Expanding Visual VISION/SPEC prose instead of implementing PLAN-P2 T7 kinds.

---

## 10. Change log

| Date | Change |
|------|--------|
| 2026-09-09 | Initial P8: production-readiness workstreams A–E derived from PLAN.md + PLAN-P1…P7 + p7-acceptance (not from ad-hoc playground archaeology). |
