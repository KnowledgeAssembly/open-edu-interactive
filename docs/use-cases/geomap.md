# GeoMap engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `geomap` (`packages/geomap-engine`)  
**Contract:** `docs/engines/geomap/SPEC.md`  
**Vision:** `docs/engines/geomap/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **layer type** (`region`, `marker`, `route`). Stable scene node ids follow `geom-{layerId}-{entityId}` (e.g. `geom-states-odisha`).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Geography, scene, SVG, semantic targets, D5 `select` / `focus` / `deselect` / `reset`, snapshot, alternative entity list |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, citation UI |

---

## Interaction modes by layer type

| Mode | Layer | Authoring signal | Learner experience | Engine events |
|------|-------|------------------|--------------------|---------------|
| **display** | region, marker, route | `interactive: false` on layer items (or layer `visible: false`) | Geography is visible; no pointer targets on that layer | — |
| **guided-select** | region, marker | Exactly one (or few) items with `interactive: true`; peers `interactive: false` | Learner taps the prompted place; only valid targets accept input | `geomap.entity-selected` |
| **discovery-select** | region, marker | Multiple items with `interactive: true` | Learner finds the correct entity among several choices | `geomap.entity-selected` |
| **explore** | region, marker (multi-layer) | `interaction.mode: "explore"`; broad `interactive: true` coverage | Free exploration; no single correct answer enforced by engine | `geomap.entity-selected`, `geomap.entity-focused` |
| **focus** | region, marker | `focus` in `interaction.actions` | Keyboard / programmatic emphasis without changing selection | `geomap.entity-focused` |
| **trace** *(planned)* | route | Route layer with `path`; step/play actions | Learner follows a path in order | `geomap.route-step` *(planned)* |
| **filter** *(planned)* | region, marker | `filter` in `interaction.actions`; category metadata on entities | Learner narrows visible entities by attribute | `geomap.filter-applied` *(planned)* |

**Node id convention:** `geom-{layerId}-{entityId}` for region and marker items; route nodes use `geom-{layerId}-{routeId}` with segment children `geom-{layerId}-{routeId}-seg-{i}`.

---

## Region layer

### `gm-r1-identify-guided` — Identify a region (guided)

| Field | Value |
|-------|-------|
| **Learner** | Sees a regional map with one state highlighted by lesson chrome; taps the named region. |
| **Prompt** *(host)* | “Select Odisha on the map.” |
| **Action** | Tap interactive region polygon |
| **Acceptance** | Only the target region is `interactive: true`; selection updates snapshot; `geomap.entity-selected` carries full entity record; selected styling via `style.role: "selected"` token |
| **Spec** | `layers[].type: "region"`, single item `interactive: true`, peers `interactive: false` |
| **Fixture** | `packages/geomap-engine/fixture/region/` |
| **Host** | Prompt + answer key on `entityId: "odisha"` |
| **Status** | `done` |

### `gm-r2-locate-discovery` — Locate a region among neighbours (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Sees several adjacent regions; must find the one matching the prompt without a pre-highlighted target. |
| **Prompt** *(host)* | “Which state borders the Bay of Bengal here?” |
| **Action** | Tap one of several interactive regions |
| **Acceptance** | Multiple region items `interactive: true`; wrong taps still emit `geomap.entity-selected` (host scores); regions remain distinguishable by label/alternative list |
| **Spec** | `layers[].type: "region"`, multiple items `interactive: true` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` (`states` layer) |
| **Host** | Scoring on `entityId`; optional retry |
| **Status** | `done` |

### `gm-r3-context-display` — Display context regions (non-interactive)

| Field | Value |
|-------|-------|
| **Learner** | Sees neighbouring regions for geographic context; only the lesson target is tappable. |
| **Prompt** *(host)* | “Odisha is shown in context with West Bengal.” |
| **Action** | None on context regions |
| **Acceptance** | Context regions rendered with `interactive: false`; no hit targets; legend distinguishes `primary-region` vs `secondary-region` roles |
| **Spec** | Mixed `interactive` flags within one `region` layer, or separate layers with `style.role` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | — |
| **Status** | `done` |

### `gm-r4-filter-regions` — Filter regions by attribute

| Field | Value |
|-------|-------|
| **Learner** | Chooses a category (e.g. “coastal states”) and the map shows only matching regions. |
| **Prompt** *(host)* | “Show only coastal states.” |
| **Action** | `filter` with category payload |
| **Acceptance** | Non-matching regions hidden or de-emphasized; `geomap.filter-applied` in event log; `clear-filter` restores full map |
| **Spec** | Entity metadata + `interaction.actions` includes `filter`, `clear-filter` |
| **Fixture** | `planned` |
| **Host** | Filter control labels |
| **Status** | `planned` |

---

## Marker layer

### `gm-m1-identify-guided` — Identify a city (guided)

| Field | Value |
|-------|-------|
| **Learner** | Sees a map with one labelled city marker as the only tappable point. |
| **Prompt** *(host)* | “Tap the capital of Odisha.” |
| **Action** | Tap marker (and optional `label: true` text) |
| **Acceptance** | Marker hit target ≥ min touch size; `geomap.entity-selected` on `geom-cities-bhubaneswar`; label visible when `label: true` |
| **Spec** | `layers[].type: "marker"`, `items[].label`, single `interactive: true` |
| **Fixture** | `packages/geomap-engine/fixture/marker/` |
| **Host** | Answer key on `entityId` |
| **Status** | `done` |

### `gm-m2-locate-discovery` — Locate a landmark among markers (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Several point features on the map; finds the one described in the prompt. |
| **Prompt** *(host)* | “Find Chilika Lake.” |
| **Action** | Tap correct marker |
| **Acceptance** | Multiple markers `interactive: true`; selection events distinguish `entityId`; alternative list names each point |
| **Spec** | `layers[].type: "marker"`, multiple interactive items |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` (`cities`, `water` layers) |
| **Host** | Scoring |
| **Status** | `done` |

### `gm-m3-focus-marker` — Focus a marker (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to move emphasis between markers without committing a selection answer. |
| **Prompt** *(host)* | Optional (“Explore cities on the map”) |
| **Action** | `focus` on `geom-{layerId}-{entityId}` |
| **Acceptance** | `geomap.entity-focused` emitted; focus ring visible; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | `packages/geomap-engine/fixture/marker/` |
| **Host** | — |
| **Status** | `done` |

---

## Route layer

### `gm-t1-display-route` — Display a trade / migration route

| Field | Value |
|-------|-------|
| **Learner** | Sees a polyline connecting ordered places; taps endpoints to learn about each stop. |
| **Prompt** *(host)* | “Follow the route from A to C.” |
| **Action** | Tap interactive markers along the route; route itself is display-only |
| **Acceptance** | Route layer renders `path` through ≥ 2 entities; route node `interactive: false`; endpoint markers `interactive: true`; `style.role: "route"` on route layer |
| **Spec** | `layers[].type: "route"` with `items[].path`; companion `marker` layer |
| **Fixture** | `packages/geomap-engine/fixture/route/` |
| **Host** | Narration per stop |
| **Status** | `done` |

### `gm-t2-trace-route` — Trace a route step-by-step

| Field | Value |
|-------|-------|
| **Learner** | Advances along a route one segment at a time (play-pause or step). |
| **Prompt** *(host)* | “Watch how goods moved along this path.” |
| **Action** | `play-pause` or namespaced `geomap.step-route` |
| **Acceptance** | Active segment emphasized; completed segments styled; monotonic event log |
| **Spec** | Route layer + timeline-style interaction block |
| **Fixture** | `planned` |
| **Host** | Transport controls |
| **Status** | `planned` |

---

## Integrated map (multi-layer)

### `gm-x1-explore-coastal` — Explore a coastal state (reference lesson)

| Field | Value |
|-------|-------|
| **Learner** | Explores regions, cities, and water features together; no single scored answer. |
| **Prompt** *(host)* | “Explore Odisha and its coastal geography.” |
| **Action** | Select / focus any interactive entity |
| **Acceptance** | Region + marker layers compose; legend visible; SVG has `title`/`desc`; every interactive node has `aria-label`; alternative list covers all entities |
| **Spec** | `interaction.mode: "explore"`; `viewport.fit: "content"`; provenance on sources |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | Lesson framing only |
| **Status** | `done` (e2e: `packages/geomap-engine/e2e/geomap.spec.ts`) |

### `gm-x2-guided-composed` — Guided lesson with context map

| Field | Value |
|-------|-------|
| **Learner** | Same integrated map as `gm-x1-explore-coastal` but only one entity is tappable for a scored step; context layers display-only. |
| **Prompt** *(host)* | “Select Odisha, then find its capital.” |
| **Action** | Sequential host workflow: dispatch `select` on region, then on marker |
| **Acceptance** | Mixed `interactive` flags across layers; `reset` clears selection between steps |
| **Spec** | Composed spec with `interaction.actions` including `reset` |
| **Fixture** | `planned` (derive from `odisha-coastal` + guided flags) |
| **Host** | Multi-step workflow |
| **Status** | `planned` |

---

## Accessibility and data fidelity

### `gm-a1-alternative-list` — Alternative representation

| Field | Value |
|-------|-------|
| **Learner** | Uses a text list/table instead of the SVG map to select or review entities. |
| **Prompt** *(host)* | — |
| **Action** | Select from alternative list (host binds list → `select` dispatch) |
| **Acceptance** | Alternative list includes every entity with non-empty `name` and `location`; nothing conveyed by color alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | List UI |
| **Status** | `done` |

### `gm-a2-validate-geography` — Reject invalid geography

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Unknown projection → `INVALID_SPEC`; missing `featureId` → `INVALID_REFERENCE`; out-of-range coordinates → `INVALID_ENTITY`; overlapping interactive regions → `INVALID_STATE` warning |
| **Spec** | Negative fixtures in e2e `tryCreate` |
| **Fixture** | `packages/geomap-engine/e2e/geomap.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/geomap-engine/fixture/region/` | `gm-r1-identify-guided` | Minimal single-region guided select |
| `packages/geomap-engine/fixture/marker/` | `gm-m1-identify-guided`, `gm-m3-focus-marker` | Single city marker + focus |
| `packages/geomap-engine/fixture/route/` | `gm-t1-display-route` | Route display + interactive endpoints |
| `packages/geomap-engine/fixture/odisha-coastal/` | `gm-r2-locate-discovery`, `gm-r3-context-display`, `gm-m2-locate-discovery`, `gm-x1-explore-coastal`, `gm-a1-alternative-list` | Integrated explore; golden scene + e2e |
| `docs/fixtures/geomap/skill-example.json` | `gm-x1-explore-coastal` | Authoring skill reference (trimmed GeoJSON) |

Conformance harness: `/?engine=geomap` (default fixture: `odisha-coastal`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `gm-x1-explore-coastal`, `gm-a1-alternative-list`, `gm-a2-validate-geography` | Exit gate: explore map, a11y, validation |
| P0 | `gm-r1-identify-guided`, `gm-m1-identify-guided` | Smallest guided-select slices per layer type |
| P1 | `gm-r2-locate-discovery`, `gm-m2-locate-discovery`, `gm-t1-display-route` | Discovery + route display |
| P2 | `gm-x2-guided-composed` | Multi-step guided composition (host + engine) |
| P3 | `gm-r4-filter-regions`, `gm-t2-trace-route` | Filter and route animation — spec names exist; engine slice not started |

---

## Contract changes (none proposed)

All `done` use cases are expressible with the current GeoMap spec surface (`region` / `marker` / `route` layers, `interactive` per item, D5 `select` / `focus` / `deselect` / `reset`). Planned cases (`gm-r4-filter-regions`, `gm-t2-trace-route`, `gm-x2-guided-composed`) may require documented namespaced actions or interaction blocks — propose in SPEC before implementation.
