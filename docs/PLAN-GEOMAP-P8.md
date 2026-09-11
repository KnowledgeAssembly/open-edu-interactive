**Staleness notice (2026-09-11):** Action names in this doc (`geomap.toggle-layer` etc.) are superseded — implement from `docs/PLAN-GEOMAP-P8-EXECUTION.md` only (D1 reuse-D5 rule). Node-id convention, projection enum, and encoding fields are source-of-truth in the execution plan.

---

# GeoMap Engine — Detailed Implementation Spec for All Use Cases

## Executive Summary

The [geomap.md](file:///Users/sarthakpatnaik/Code/openedu-interactive/docs/use-cases/geomap.md) use-case catalog describes **37 use cases** across 12 groups. Of these, **9 are `done`** (the P0–P1 priority slice) and **28 are `planned`**. 

Based on recent design decisions, the planned cases require **8 new capabilities** (down from 10, as `construct-mark` is deferred and `period-slice` will leverage existing Timeline engine composition). 

Crucially, **`d3-geo` will be adopted immediately** to provide robust projection, accurate centroids, and precise scale-bar calculations.

---

## Design Decisions Log (Resolved)

*   **`construct-mark` Scope:** **Deferred.** This introduces learner-authored entities (a fundamentally different data flow) and will be handled in a separate, dedicated design doc later.
*   **`attr-encoding` Role Naming:** **Generic Approach.** To respect the strict closed set of roles (P11), the engine will use generic semantic bucket names (e.g., `encoding-bucket-1`, `encoding-bucket-2`) rather than dynamically generating domain-specific roles (like `rainfall-low`). The theme will map these generic buckets to appropriate visual scales.
*   **`d3-geo` Timing:** **Immediate Adoption.** We will introduce `d3-geo` right away in Workstream A to ensure `scale-bar` accuracy and correct geometric clipping, rather than waiting for Workstream D.
*   **Historical Geography (`period-slice`):** **Timeline Composition.** GeoMap will *not* build its own internal timeline. Instead, it will rely on the external OpenEdu event bus, listening for Timeline engine events (e.g., `timeline.event-selected`) to trigger `geomap.toggle-layer` actions, displaying the correct historical boundaries.

---

## Current Engine Inventory

### What Exists (Done)

The current [engine.ts](file:///Users/sarthakpatnaik/Code/openedu-interactive/packages/geomap-engine/src/engine.ts) and [schema.ts](file:///Users/sarthakpatnaik/Code/openedu-interactive/packages/geomap-engine/src/schema.ts) provide:

| Feature | Implementation |
|---------|---------------|
| Layer types | `region`, `marker`, `route`, `label` |
| Entity types | 12 geographic types (country → place) |
| Projection | `equirectangular` only (hand-rolled) |
| Scene build | GeoJSON → scene nodes with centroid-of-polygon |
| SVG render | `<path>` for regions, `<circle>` for markers, `<polyline>` for routes |
| Actions | `select`, `deselect`, `focus`, `unfocus`, `reset` |

### New Capabilities Needed (8 Capabilities)

| # | Capability | Use Cases | Complexity | Dependencies |
|---|-----------|-----------|------------|-------------|
| 1 | `linear-feature` | gm-loc-1, gm-move-2, gm-move-3 | Medium | Selectable line geometry |
| 2 | `legend-link` | gm-leg-1 | Medium | Legend ↔ entity emphasis binding |
| 3 | `scale-bar` | gm-scale-1, gm-scale-2, gm-asm-1 | Medium | Scene node + **d3.geoDistance** |
| 4 | `adjacency` | gm-dir-1, gm-nav-2 | Low | Alternative list enrichment |
| 5 | `attr-encoding` | 11 use cases | **High** | Data-driven fill/size, generic bucket roles |
| 6 | `route-step` | gm-move-1, gm-move-4, gm-t2 | Medium | Step state + events |
| 7 | `layer-visibility` | gm-ovl-1…3, gm-hist-1, gm-hist-3 | Medium | Toggle action + event (used by Timeline) |
| 8 | `filter-category` | gm-dist-3, gm-r4, gm-move-3 | Medium | Category metadata + filter state |

*(Note: `construct-mark` is deferred to a future spec).*

---

## Use-Case Implementation Details

### Tier 1 — Existing Mechanics (No New Capability)

These planned use cases compose from existing capabilities. They need new **fixtures** and possibly new **host workflow patterns**, but no engine contract changes.

*   **`gm-x2-guided-composed`:** Guided lesson with context map. Uses existing `select` → `reset` → `select` pattern.
*   **`gm-loc-2-multi-locate`:** Label a whole map in sequence. Uses existing `select`/`reset`.
*   **`gm-nav-1-follow-compass`:** Compass is host chrome. Engine provides discovery-select.
*   **`gm-nav-2-locate-in-region`:** Marker + region overlay. Host scores containment.
*   **`gm-cmp-3-relief-order`:** Engine emits monotonic sequence of `geomap.entity-selected` events. Host scores order.
*   **`gm-hist-2-place-memory`:** Standard markers, but metadata contains historical data requiring provenance.

---

### Tier 2 — New Capabilities (Detailed Specs)

#### Capability 1: `linear-feature`
**Problem:** Currently, `route` layer items are `interactive: false` by hardcoded logic. Rivers and borders need to be selectable.
**Spec:** Add `interactive: z.boolean().optional()` and `label: z.boolean().optional()` to `RouteItemSchema`.
**Behavior:** Interactive routes get a transparent hit-area `<path>` overlay (stroke-width ≥ 44px for accessibility) and emit `geomap.entity-selected` with the route's path items.

#### Capability 2: `legend-link`
**Problem:** Selecting a legend row should emphasize matching map entities.
**Spec:** Add `linkedEntities: z.array(z.string()).optional()` to `LegendItemSchema`.
**Behavior:** `focus` on a legend item emits `geomap.legend-linked` with the entity IDs, allowing the renderer to apply an `emphasis` visual state without altering actual selection state.

#### Capability 3: `scale-bar` & `d3-geo` Integration
**Problem:** No distance scale exists, and current equirectangular math distorts distances heavily.
**Spec:** Add `scaleBar: { visible?: boolean, unit?: 'km' | 'mi' }` to GeoMap content schema.
**Behavior:** 
1. Introduce `d3-geo` to the projection pipeline immediately.
2. Use `d3.geoDistance()` between viewport bounds to calculate accurate real-world distances.
3. Render a scale-bar `<g>` node in the bottom-left of the viewport.
4. Expose `snapshot.scaleBar = { lengthKm, lengthPx }`.

#### Capability 4: `adjacency`
**Problem:** The alternative list doesn't expose neighbor relationships for screen readers.
**Spec:** Add `adjacentTo: z.array(z.string()).optional()` to `EntitySchema`.
**Behavior:** `geomap.entity-selected` payload includes this array. The alternative list textually enumerates neighboring entities. (This is strictly authored data, not computed via geometry intersections).

#### Capability 5: `attr-encoding` (Generic Buckets)
**Problem:** Need data-driven visualization (choropleth, graduated sizes) without using color-only semantics.
**Spec:** 
- Add `measure: { attribute: string, value: number }` to layer items.
- Add `encoding: { attribute, type: 'fill' | 'size', scale, breakpoints }` to layer schema.
**Behavior:** 
- Values are mapped to a closed, generic set of roles (e.g., `encoding-bucket-1`, `encoding-bucket-2`, `encoding-bucket-3`, etc.).
- Region fills use `data-oedu-role="encoding-bucket-N"`. The OpenEdu theme will map these generic buckets to appropriate color ramps and patterns.
- Auto-generates legend entries explaining what value range corresponds to each bucket.

#### Capability 6: `route-step`
**Problem:** Routes cannot be animated or stepped through segment-by-segment.
**Spec:** Add actions `geomap.step-route` and `geomap.scrub-route`.
**Behavior:** Engine tracks `activeRouteId` and `activeStep`. Completed segments receive `role: "route-completed"`, active gets `"route-active"`. Emits `geomap.route-step`.

#### Capability 7: `layer-visibility` (For Historical Composition)
**Problem:** Need to overlay risk zones or show historical boundary changes (`period-slice`).
**Spec:** Add action `geomap.toggle-layer` targeting a layer ID.
**Behavior:** 
- Instead of building a custom "timeline" inside GeoMap, historical courses will use the OpenEdu **Timeline Engine** alongside GeoMap.
- When the Timeline emits a date change, the host routes a `geomap.toggle-layer` action to GeoMap, hiding the 1800s borders and showing the 1900s borders. 
- Selection identity is preserved across toggles.
- Emits `geomap.layer-toggled`.

#### Capability 8: `filter-category`
**Problem:** Need to isolate regions based on metadata (e.g., "show only coastal states").
**Spec:** Add `categories: string[]` to `EntitySchema`. Use existing D5 `filter` / `clear-filter` actions.
**Behavior:** Non-matching entities are assigned `hidden: true` in the scene. Emits `geomap.filter-applied`.

---

## d3-geo Adoption Plan (Immediate)

Because we are introducing `d3-geo` now (Workstream A) to solve the scale-bar and projection accuracy issues, the layout pipeline will be refactored immediately.

**Architecture:**
```text
                    GeoMap Engine (semantic model)
                              │
                      ProjectionAdapter 
                              │
                    ┌─────────┼─────────┐
                    ▼                   ▼
               d3-geo paths         d3.geoDistance()
            (mercator, albers)     (accurate scale-bar)
```

**Implementation Steps:**
1. Add `d3-geo` as a dependency.
2. Replace [projection.ts](file:///Users/sarthakpatnaik/Code/openedu-interactive/packages/geomap-engine/src/layout/projection.ts) with a `ProjectionAdapter` interface.
3. Use `d3.geoPath()` for SVG generation (fixes antimeridian crossing and great-circle arcs).
4. Use `d3.geoCentroid()` for accurate label/marker placement.
5. Use `d3.geoDistance()` to calculate the scale bar lengths dynamically based on current viewport bounds.

---

## Proposed Execution Sequence

### Phase A.1 — Core Refactor & d3-geo (3 Days)
- Add `d3-geo` dependency.
- Refactor layout pipeline to use `ProjectionAdapter` and `d3.geoPath()`.
- Implement `scale-bar` component using `d3.geoDistance()`.
- Verify golden SVGs are updated deterministically.

### Phase A.2 — Schema & Interactions (3 Days)
- Update `schema.ts` for `measure`, `categories`, `adjacentTo`, `linkedEntities`.
- Extend engine reducer for `filter`, `clear-filter`, `geomap.toggle-layer`, `geomap.step-route`, `geomap.scrub-route`.
- Implement `layer-visibility` toggling (crucial for Timeline cross-engine composition).

### Phase A.3 — Data-Driven Visualization (4 Days)
- Implement `attr-encoding` capability.
- Build logic to bucket values into `encoding-bucket-1...N` roles.
- Auto-generate legends from encodings.
- Ensure `<pattern>` or texture generation fallback exists for P6 (Accessibility) compliance.

### Phase A.4 — Validation & Documentation (2 Days)
- Write unit tests for all new action reducers.
- Create JSON fixtures for the new NIOS use cases.
- Update `SPEC.md` to reflect all D5 additions, generic roles, and the Timeline composition pattern.

---

## Verification Plan

### Automated Tests
1. **Projection Tests**: Assert `d3-geo` handles antimeridian clipping correctly.
2. **Schema Validation**: Zod validates all new fields (`encoding`, `adjacentTo`) and rejects unknown fields.
3. **Event Tests**: Dispatch `geomap.toggle-layer` → assert `geomap.layer-toggled` event and scene hidden state changes.
4. **Alternative View**: Ensure scale bar descriptions and adjacency neighbor lists appear in the accessible textual output.

### Manual Verification
Review against the Playground App (`pnpm playground`, port 5174):
- Scale bar visually scales when zooming/panning.
- Generic bucket roles (`encoding-bucket-N`) correctly map to visual distinctions without relying solely on color.
- Interactive routes can be tapped and trigger selection events.
