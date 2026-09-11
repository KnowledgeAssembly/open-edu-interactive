# Diagram engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `diagram` (`packages/diagram-engine`)  
**Contract:** `docs/engines/diagram/SPEC.md`  
**Vision:** `docs/engines/diagram/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **diagram kind** (`flow`, `cycle`, `hierarchy`, `concept-map`). Stable scene node ids follow `node-{nodeId}` for nodes and `edge-{from}-{to}` for edges (authored node ids also resolve in dispatch).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Graph model, auto-layout, scene, SVG, semantic targets, D5 `select` / `focus` / `follow` / `expand` / `collapse` / `reset`, snapshot, alternative relationship list |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, cross-engine links via `nodes[].links` |

---

## Interaction modes by diagram kind

| Mode | Kind | Authoring signal | Learner experience | Engine events |
|------|------|------------------|--------------------|---------------|
| **display** | all | Host asks without requiring selection; diagram is reference | Learner reads structure from labels and layout | — |
| **guided-select** | all | Host prompt names one node; future per-node gating | Learner taps the prompted stage or concept | `diagram.node-selected` |
| **discovery-select** | all | All nodes visible; host scores on `nodeId` | Learner finds the correct node among candidates | `diagram.node-selected` |
| **explore** | all | `interaction.mode: "explore"` | Free exploration of nodes and relationships | `diagram.node-selected`, `diagram.node-focused`, `diagram.relationship-followed` |
| **follow** | all | `follow` in `interaction.actions` | Learner traces an authored edge | `diagram.relationship-followed` |
| **focus** | all | `focus` in `interaction.actions` | Keyboard / programmatic emphasis on a node | `diagram.node-focused` |
| **expand-collapse** | hierarchy | `contains` / `part-of` edges; `expand` / `collapse` in actions | Learner reveals or hides subtree children | — *(state change only; no bespoke event)* |

**Node id convention:** scene nodes use `node-{nodeId}`; edges use `edge-{from}-{to}` unless `edges[].id` is authored. Dispatch accepts either `node-{nodeId}` or the authored `nodeId`.

**Layout:** `layout.type` at envelope root (`radial` | `hierarchical` | `grid`) is a strategy selector — never author coordinates. Auto-layout positions are `positionSource: 'illustrative'` (DESIGN §9).

**Graph laws (enforced):** `flow` and `hierarchy` MUST be acyclic DAGs; `cycle` MUST contain ≥ 1 directed cycle; `concept-map` MAY contain cycles. Every edge MUST declare an explicit `relationship` — never infer causality from adjacency.

**Guided vs discovery (current slice):** every node and edge is `interactive: true` in the scene. Host distinguishes guided lessons by prompt and scores on `nodeId` / `relationship`. Per-node `interactive` gating is not implemented yet — propose in SPEC if two or more use cases require it.

---

## Flow diagram (`content.kind: "flow"`)

Reference UX: acyclic process or progression. Default layout: `hierarchical`.

### `di-f1-trace-process` — Follow a linear process (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores Start → Process → End to understand sequence. |
| **Prompt** | Host: “What happens after Start?” |
| **Action** | Select nodes or `follow` edges along the path |
| **Acceptance** | Three nodes in DAG order; `leads-to` edges explicit; no directed cycle; `select` → `diagram.node-selected`; `follow` → `diagram.relationship-followed` |
| **Spec** | `kind: "flow"`, `edges[].relationship: "leads-to"`, acyclic graph |
| **Fixture** | `packages/diagram-engine/fixture/flow/` |
| **Host** | Discussion or scored follow-up |
| **Status** | `done` |

### `di-f2-identify-next-step` — Which step comes next? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the node that follows Process in the flow. |
| **Prompt** | Host: “What comes after Process?” |
| **Action** | Tap the correct node (`End`) |
| **Acceptance** | Wrong node selections still emit `diagram.node-selected` (host scores); event payload includes `nodeId` |
| **Spec** | Same flow model as `di-f1-trace-process` |
| **Fixture** | `packages/diagram-engine/fixture/flow/` |
| **Host** | Answer key: `end` |
| **Status** | `done` |

### `di-f3-reject-cycle` — Flow must not contain a cycle (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Back-edge in a `flow` diagram → `INVALID_ENTITY`; `tryCreate` fails |
| **Spec** | `kind: "flow"` with `a → b → a` edge pair |
| **Fixture** | `packages/diagram-engine/e2e/diagram.spec.ts`, `packages/diagram-engine/test/validation.test.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Cycle diagram (`content.kind: "cycle"`)

Reference UX: circular process with ≥ 1 directed cycle. Default layout: `radial`.

### `di-c1-explore-cycle` — Explore a cyclical process (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores the water cycle stages in any order. |
| **Prompt** | Host: “Explore how water moves through the cycle.” |
| **Action** | Select / focus any stage; follow any `leads-to` edge |
| **Acceptance** | Four nodes in a closed cycle; radial layout; alternative list includes ≥ 1 `cycle` row; `nodes[].links` preserved in selection payload |
| **Spec** | `kind: "cycle"`, `layout: { type: "radial" }`, closed `leads-to` loop |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Lesson framing only |
| **Status** | `done` (e2e: `packages/diagram-engine/e2e/diagram.spec.ts`) |

### `di-c2-identify-stage` — Which stage follows evaporation? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the stage that comes after evaporation. |
| **Prompt** | Host: “What happens right after evaporation?” |
| **Action** | Tap `condensation` node |
| **Acceptance** | Selection id resolves to `evaporation` / `node-evaporation`; payload `nodeId: "condensation"` on correct tap |
| **Spec** | Same cycle model as `di-c1-explore-cycle` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Answer key: `condensation` |
| **Status** | `done` |

### `di-c3-follow-relationship` — Trace a relationship (follow)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: follows the edge from collection back to evaporation. |
| **Prompt** | Host: “Follow the path from Collection back to Evaporation.” |
| **Action** | `follow` on `edge-collection-evaporation` |
| **Acceptance** | `diagram.relationship-followed` emitted; payload includes `relationship: "leads-to"`, `fromNodeId`, `toNodeId` |
| **Spec** | `interaction.actions` includes `follow` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Optional narration on follow |
| **Status** | `done` |

### `di-c4-minimal-cycle` — Minimal two-node cycle (baseline)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: sees the smallest valid cycle diagram. |
| **Prompt** | Host: “Stage A and Stage B form a repeating cycle.” |
| **Action** | Select either node |
| **Acceptance** | Two nodes, two opposing `leads-to` edges; cycle detection passes; golden scene + SVG stable |
| **Spec** | `kind: "cycle"` with 2-node cycle |
| **Fixture** | `packages/diagram-engine/fixture/cycle/` |
| **Host** | — |
| **Status** | `done` |

### `di-c5-reject-acyclic` — Cycle kind must contain a cycle (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | `kind: "cycle"` with only acyclic edges → `INVALID_ENTITY` |
| **Spec** | Single `leads-to` edge between two nodes |
| **Fixture** | `packages/diagram-engine/test/validation.test.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Hierarchy diagram (`content.kind: "hierarchy"`)

Reference UX: tree or organizational structure. Default layout: `hierarchical`. `contains` / `part-of` edges enable expand/collapse.

### `di-h1-explore-tree` — Explore an organizational tree (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores Root and its children. |
| **Prompt** | Host: “What does Root contain?” |
| **Action** | Select nodes; optional expand on Root |
| **Acceptance** | `contains` edges from Root to children; hierarchical layout; nodes labelled |
| **Spec** | `kind: "hierarchy"`, `relationship: "contains"` on parent → child edges |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Open response or discussion |
| **Status** | `done` |

### `di-h2-expand-collapse` — Reveal or hide subtree (expand / collapse)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: expands CEO node to reveal reports, then collapses to hide them. |
| **Prompt** | Host: “Show the teams under the CEO.” |
| **Action** | `expand` on `node-ceo`; `collapse` on same node |
| **Acceptance** | `snapshot.expanded` includes child node ids after expand; children hidden after collapse; only nodes with `contains`/`part-of` outgoing edges accept expand/collapse |
| **Spec** | `interaction.actions` includes `expand`, `collapse` |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Expand control labels |
| **Status** | `done` (`packages/diagram-engine/test/instance.test.ts`) |

### `di-h3-identify-parent` — Which node contains Child 1? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the parent of Child 1. |
| **Prompt** | Host: “Which node contains Child 1?” |
| **Action** | Tap Root |
| **Acceptance** | `contains` edge `root → child1` in alternative list; selection payload identifies parent `nodeId` |
| **Spec** | Same hierarchy model as `di-h1-explore-tree` |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Answer key: `root` |
| **Status** | `done` |

---

## Concept map (`content.kind: "concept-map"`)

Reference UX: associative web of concepts; cycles allowed. Default layout: `grid`.

### `di-m1-explore-concepts` — Explore conceptual relationships (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: explores how Gravity and Mass relate to Weight. |
| **Prompt** | Host: “How are these concepts connected?” |
| **Action** | Select nodes; follow `influences` edges |
| **Acceptance** | Three nodes; two `influences` edges converge on Weight; node `description` available in metadata |
| **Spec** | `kind: "concept-map"`, `relationship: "influences"` |
| **Fixture** | `packages/diagram-engine/fixture/concept-map/` |
| **Host** | Discussion |
| **Status** | `done` |

### `di-m2-identify-influence` — What influences Weight? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: selects a concept that influences Weight. |
| **Prompt** | Host: “Tap one concept that influences Weight.” |
| **Action** | Tap Gravity or Mass |
| **Acceptance** | Both are valid selections; host scores on `nodeId`; edge labels show relationship type in alternative list |
| **Spec** | Same concept-map model as `di-m1-explore-concepts` |
| **Fixture** | `packages/diagram-engine/fixture/concept-map/` |
| **Host** | Answer key: `gravity` or `mass` (or both accepted) |
| **Status** | `done` |

### `di-m3-cyclic-concept-map` — Concept map with a cycle *(planned)*

| Field | Value |
|-------|-------|
| **Learner** | Grades 7–9: explores reciprocal influences between concepts. |
| **Prompt** | Host: “How do these ideas reinforce each other?” |
| **Action** | Select nodes along a cyclic path |
| **Acceptance** | `concept-map` kind accepts directed cycle; layout remains deterministic |
| **Spec** | `kind: "concept-map"` with back-edge |
| **Fixture** | `planned` |
| **Host** | — |
| **Status** | `planned` |

---

## Cross-kind

### `di-x1-focus-node` — Focus without selecting (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to inspect a node before answering. |
| **Prompt** | Host: optional (“Use arrow keys to explore each stage.”) |
| **Action** | `focus` on `node-{nodeId}` or authored `nodeId` |
| **Acceptance** | `diagram.node-focused` emitted; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | Any fixture |
| **Host** | — |
| **Status** | `done` |

### `di-x2-visual-entity-link` — Node links to Visual engine entity

| Field | Value |
|-------|-------|
| **Learner** | Selects Evaporation; host highlights linked water figure in a composed lesson. |
| **Prompt** | Host: “Select the stage where liquid becomes vapour.” |
| **Action** | `select` on node with `links.visualEntityId` |
| **Acceptance** | `diagram.node-selected` payload includes `links.visualEntityId`; cross-engine composition via event bus, not imports |
| **Spec** | `nodes[].links: { visualEntityId: "…" }` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Composed lesson chrome |
| **Status** | `done` |

### `di-x3-identify-relationship` — What relationship connects two nodes? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: follows or identifies the relationship between two named nodes. |
| **Prompt** | Host: “What is the relationship from Evaporation to Condensation?” |
| **Action** | `follow` on `edge-evaporation-condensation` |
| **Acceptance** | `diagram.relationship-followed` payload includes `relationship: "leads-to"`; alternative list names edge with relationship |
| **Spec** | Explicit `edges[].relationship` required |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Answer key: `leads-to` |
| **Status** | `done` |

### `di-x4-photosynthesis-flow` — Multi-input process flow (authoring reference)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: traces inputs (sunlight, water, CO₂) through chloroplast to outputs. |
| **Prompt** | Host: “What do sunlight, water, and carbon dioxide produce?” |
| **Action** | Follow edges into and out of chloroplast |
| **Acceptance** | DAG with converging inputs and diverging outputs; all relationships explicit |
| **Spec** | `kind: "flow"`, multiple `leads-to` edges |
| **Fixture** | `docs/fixtures/diagram/skill-example.json` |
| **Host** | Scoring on output nodes |
| **Status** | `done` |

---

## Accessibility and data fidelity

### `di-a1-alternative-list` — Structured relationship list

| Field | Value |
|-------|-------|
| **Learner** | Uses a table/list of nodes, edges, and cycles instead of the SVG diagram. |
| **Prompt** | — |
| **Action** | Host binds list row → `select` or `follow` dispatch |
| **Acceptance** | Alternative includes node rows, edge rows with non-empty `relationship`, and cycle rows for cyclic graphs; nothing conveyed by color or position alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | List presentation chrome |
| **Status** | `done` |

### `di-a2-validate-graph` — Reject invalid specs

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Unknown `kind` → `INVALID_SPEC`; unknown `layout.type` (e.g. `force`) → `INVALID_SPEC`; unknown content/node keys → `INVALID_SPEC`; edge without `relationship` → schema failure; unknown node reference → `INVALID_REFERENCE`; self-loop → `INVALID_ENTITY`; empty `nodes[]` → `INVALID_SPEC` |
| **Spec** | Negative cases in unit tests + e2e `tryCreate` |
| **Fixture** | `packages/diagram-engine/test/validation.test.ts`, `packages/diagram-engine/e2e/diagram.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Future diagram kinds (SPEC — not in MVP slice)

### `di-p1-label-diagram` — Annotated figure with callouts

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–8: labels parts of a scientific illustration. |
| **Prompt** | Host: “Select the part that carries blood to the heart.” |
| **Action** | Select labelled node |
| **Acceptance** | `content.kind: "label-diagram"` (future enum value); nodes map to figure regions via `links` |
| **Spec** | Future kind; replaces legacy `science.label-diagram` widget |
| **Fixture** | `planned` |
| **Host** | Scoring + figure asset |
| **Status** | `planned` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/diagram-engine/fixture/flow/` | `di-f1-trace-process`, `di-f2-identify-next-step` | Acyclic 3-node DAG; hierarchical layout |
| `packages/diagram-engine/fixture/cycle/` | `di-c4-minimal-cycle` | Minimal 2-node cycle |
| `packages/diagram-engine/fixture/hierarchy/` | `di-h1-explore-tree`, `di-h2-expand-collapse`, `di-h3-identify-parent` | `contains` edges; expand/collapse |
| `packages/diagram-engine/fixture/concept-map/` | `di-m1-explore-concepts`, `di-m2-identify-influence` | Grid layout; `influences` edges |
| `packages/diagram-engine/fixture/water-cycle/` | `di-c1-explore-cycle`, `di-c2-identify-stage`, `di-c3-follow-relationship`, `di-x2-visual-entity-link`, `di-x3-identify-relationship`, `di-a1-alternative-list` | Integrated cycle; default e2e harness fixture |
| `docs/fixtures/diagram/skill-example.json` | `di-x4-photosynthesis-flow` | Multi-input flow authoring reference |

Conformance harness: `/?engine=diagram` (default fixture: `water-cycle`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `di-c1-explore-cycle`, `di-a1-alternative-list`, `di-a2-validate-graph` | Exit gate: cycle explore, a11y list, validation |
| P0 | `di-f1-trace-process`, `di-h1-explore-tree`, `di-m1-explore-concepts` | One baseline per kind |
| P1 | `di-c3-follow-relationship`, `di-h2-expand-collapse`, `di-x1-focus-node` | Follow, expand/collapse, focus mechanics |
| P1 | `di-f2-identify-next-step`, `di-c2-identify-stage`, `di-h3-identify-parent`, `di-m2-identify-influence` | Discovery scoring paths |
| P2 | `di-x2-visual-entity-link`, `di-x3-identify-relationship`, `di-x4-photosynthesis-flow` | Composition and multi-input flow |
| P3 | `di-m3-cyclic-concept-map`, `di-p1-label-diagram` | Cyclic concept-map fixture; future label-diagram kind |

---

## Contract changes (none proposed)

All `done` use cases are expressible with the current Diagram spec surface (`flow` / `cycle` / `hierarchy` / `concept-map`, explicit `relationship` on edges, D5 `select` / `focus` / `follow` / `expand` / `collapse` / `reset`). Planned cases (`di-m3-cyclic-concept-map`, `di-p1-label-diagram`) may require new fixtures or `kind` enum values — propose in SPEC before implementation.
