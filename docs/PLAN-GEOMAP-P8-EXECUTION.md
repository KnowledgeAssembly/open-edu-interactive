# GeoMap P8 — Execution Plan for an Implementer Agent

**Source reviewed:** `docs/PLAN-GEOMAP-P8.md` (review findings §1; reviewed output v2 — incorporates one round of implementer-review fixes).
**Implementer target:** a fast agent (deepseek-4-flash class). This plan is byte-level; follow it top to bottom. Test-first, one phase at a time.

---

## 1. Review of `PLAN-GEOMAP-P8.md` (verified against the repo)

The plan is sound in direction. The following corrections/decisions are binding — do not silently follow the source plan where it disagrees:

| # | Finding | Resolution |
|---|---------|-----------|
| R1 | Counts are stale. Catalog is 48 use cases (10 `done`, 38 `planned`), not 37/9/28. | Do not reference old counts. Phase 5 re-syncs the catalog. |
| R2 | `geomap.toggle-layer` / `geomap.step-route` / `geomap.scrub-route` are NOT valid action types. `EngineAction.type` must be a member of the shared closed D5 `ACTION_TYPES` (`packages/interactive-engine/src/schemas/actions.ts`), which contains `toggle`, `step`, `scrub`, `filter`, `clear-filter`, `reset`. | **Reuse D5 actions targeted at scene node ids; keep EVENTS namespaced (`geomap.layer-toggled`, `geomap.route-step`, …).** See D1. |
| R3 | The engine does not re-render on dispatch today (scene/svg computed once at `instantiate`). | Derived display scene (D2). |
| R3b | **Shared `baseReducer` semantics do not match GeoMap needs** (critical): `step` is a single global scalar, gated on `playback === 'paused'` (`reducer.ts:81`); `scrub` is `reducer.ts:90` and never writes `state.step`; `toggle` writes `expanded[]` (`reducer.ts:53-56`), irrelevant to layer visibility. | GeoMap MUST derive its display state (D1 rule), never `state.expanded` / `state.step`. |
| R4 | e2e `geomap.spec.ts:59` asserts `projection: { type: 'mercator' }` is rejected; Parity `schema-parity.test.ts:34` asserts `projection.type.enum === ['equirectangular']`; `validation/semantic.ts:38-40` hardcodes a second equirectangular-only rejection; `layout/engine.ts:74` hardcodes `makeProjector('equirectangular', …)`; `test/validation.test.ts:72-80` rejects mercator as an unknown projection. | Update all five (e2e + parity + semantic + layout + validation test) to allow `mercator`/`albers`; reject `orthographic` accordingly. |
| R5 | TWO JSON Schemas exist (`packages/geomap-engine/src/schemas/geomap-spec.schema.json` and `docs/schemas/geomap-spec.schema.json`) and must stay in lockstep (P11). | Update both in Phase 0. |
| R6 | Scale bar is static (no runtime camera; `viewport.zoom` only sets the initial frame). The source plan's "scales on zoom" verification is not implementable. | Scale bar computed from the fixed viewport; camera out of scope. |
| R7 | `period-slice` = composition, not an internal timeline (both catalog and plan agree). | Provide `layer-visibility` surface + SPEC §64 pattern; Phase 5 rewrites SPEC §36/§37 (they still say "engine determines visibility based on the active timeline state", `SPEC.md:1297`). |
| R8 | Route segments are not indexed in `scene.semantics` (`build.ts:181` indexes only the route node), so `findEntityPayload` can't resolve a segment target. | Index interactive segments; interactive is opt-in via `RouteItemSchema.interactive`. |

The 8-capability list, d3-geo timing (immediate), generic-bucket encoding, and `construct-mark` deferral are carried forward unchanged.

---

## 2. Architecture decisions (binding)

### D1 — Actions: reuse D5; derive ALL display state from the event sequence (not `state` fields)
Dispatch surface (all in the shared `ACTION_TYPES`; **never edit `actions.ts`**):

| Intent | Dispatch | Result event |
|--------|----------|-------------|
| Toggle a layer's visibility | `{ type: 'toggle', target: { id: 'geom-<layerId>' } }` | `geomap.layer-toggled` (payload `{ layerId, hidden }`) |
| Advance a route step | `{ type: 'step', target: { id: 'geom-<layer>-<routeId>' } }` | `geomap.route-step` (payload `{ routeId, step }`) |
| Jump a route step | `{ type: 'scrub', target: { id: 'geom-<layer>-<routeId>' }, payload: { step } }` | `geomap.route-step` |
| Filter to node ids | `{ type: 'filter', payload: { ids: string[] } }` | `geomap.filter-applied` (payload `{ ids }`) |
| Filter by category | `{ type: 'filter', payload: { categories: string[] } }` | `geomap.filter-applied` (payload `{ ids: <resolved node ids>, categories }`) |
| Clear filter / reset | `{ type: 'clear-filter' }` / `{ type: 'reset' }` | `geomap.filter-applied` (payload `{ ids: [] }`) on clear-filter |

**Filter payload decision (fixes ambiguity, geomap.md:89 / 445):** BOTH forms are accepted and documented (Option A+B merged).
- `{ ids }` — host pre-resolves to `geom-*` node ids (base `EngineState.filter`).
- `{ categories }` — engine resolves via entity item metadata `categories: string[]` (authored on `EntitySchema`). A node is visible if its `categories` set intersects the filter `categories`. Resolved ids are exposed on the event and in `snapshot.filter`.

**THE RULE (do not deviate):** GeoMap MUST derive the display scene from a **deterministic fold over the dispatch sequence since mount** (or engine-local maps — `hiddenLayerIds: Set<string>`, `activeRouteSteps: Record<string, number>`, `filterCategories: string[]` — updated only inside `dispatch` and cleared on `reset`). It MUST NOT read `state.expanded` (that is the hierarchy/Timeline toggle namespace), `state.step` (global scalar, gated on `playback`), or `state.playback`. `baseReducer` still runs to maintain the shared `EngineState` (selection/focus/filter/lastAction); the display layer reads only the derived maps. The same event log MUST replay to the identical scene (P4). Snapshot additionally exposes `snapshot.displayState = { hiddenLayerIds, activeRouteSteps, filterCategories }` for host/debug and replay tests.

### D2 — Derived display scene (prerequisite for all capabilities)
Pipeline change in `engine.ts`/`render.ts`:

```text
buildScene(content)  → cached "authored scene"
layout(authored, ctx, viewport, projectionType)  → cached "laid-out base"   (once)
per dispatch:
  baseReducer(state, action)                 // shared fields only (D1)
  push action onto the local fold / maps     // D1 derivation
  scene  = deriveDisplay(maps, filterState, structuredClone(laidoutBase))
  svgResult = svgFrom(scene, ctx, label, desc)
  laidOut = scene                            // snapshot returns this
```

`deriveDisplay` is pure: same `(base, maps, state)` → same scene; never mutates `state` or the base. It sets on the clone: `hidden` (layer toggles, filters, authored `layer.visible === false`), route-step `role`s, legend-emphasis flags. Positions/bounds come from the cached base — `deriveDisplay` must NOT call `layout`.

### D3 — d3-geo adoption (immediate, authorized override)
- Add `d3-geo@^3` to `packages/geomap-engine/package.json` — the ONLY new dependency (core package stays zod-only).
- **Authorized override:** `docs/PLAN-P8.md` Workstream A bans new dependencies. This execution plan explicitly overrides that for GeoMap slice honesty (scale-bar accuracy via `d3.geoDistance`, accurate centroids via `d3.geoCentroid`, mercator/albers, antimeridian-safe clipping). Treat as approved; do not regress it; do not add any other dependency.
- Keep the `Projector` interface (`src/layout/projection.ts`) so layout callers change only for the new `type` argument. Implement with d3 (`geoEquirectangular` / `geoMercator` / `geoAlbers`). Default remains equirectangular, configured so output is numerically equivalent to today where possible — but **goldens are still regenerated and reviewed** (float noise acceptable; structural change is not).
- `projection.type`: `z.enum(['equirectangular','mercator','albers'])`.
- Replace `centroidOf` (`scene/build.ts:28`) with `d3.geoCentroid` (keep the Point short-circuit).
- `layout(scene, ctx, viewport, projectionType)` — projection type flows from `content.projection.type`.

### D4 — attr-encoding: generic buckets, theme-owned visuals, one convention
- **Pinned convention (single source of truth):** the bucket role string is **`encoding-bucket-<n>`** (n ≥ 1) everywhere: `metadata.encodingBucket`, SVG attribute `data-oedu-encoding="encoding-bucket-<n>"`, auto-legend `data-oedu-encoding` attr, and theme key. Do NOT use `bucket-<n>` anywhere.
- Authoring: `measure: { attribute, value }` (item or entity) + layer-level `encoding: { attribute, type: 'fill'|'size', breakpoints: [number, number][] }` (ascending, ≥1 pair).
- Runtime: deterministic bucketing (clamp to first/last bucket). Never literal colors; theme maps bucket → ramp/pattern (P2/P6). `data-oedu-role` stays semantic.
- Legend: auto-append bucket entries ("`<attribute>`: [lo–hi)") after authored items, each carrying `data-oedu-encoding="encoding-bucket-<n>"`. No bespoke `geomap.theme-view` / `geomap.encoding-view` event — attribute-view is a **display-state** feature (a layer whose `encoding` is present), not an event (see Phase 5 catalog sync).

### D5 — scale bar (static viewport)
`content.scaleBar: { visible?: boolean, unit?: 'km'|'mi' }` (default `{ visible: true, unit: 'km' }`). Per render: pick a nice length (1-2-5×10ⁿ) ≈ ¼ of viewport width in px; `lengthPx` from projection; verify with `d3.geoDistance` between the two end-point lon/lat. Exposed as `snapshot.scaleBar = { lengthKm, lengthPx, unit, label }`; rendered `<g data-oedu-role="scale-bar">` (line + `<text>`) bottom-left; included in the alternative list (kind `scale-bar`). Deterministic. No camera (R6).

### D6 — period-slice = composition, not engine feature
GeoMap exposes only `toggle` + `geomap.layer-toggled`. The host (OpenEdu runtime) listens for Timeline events and routes `toggle` actions to GeoMap (engine isolation, D2/§6 — GeoMap must never import Timeline). Phase 5 REWRITES SPEC §36/§37 (currently contradictory: they describe internal temporal layers) to composition-only, plus adds the §64 pattern.

---

## 3. Primer: current engine (what the agent is editing)

| Concern | File | Fact |
|--------|------|------|
| Authoring schema (Zod, strict) | `packages/geomap-engine/src/schema.ts` | `EntitySchema` (46), `ItemSchema` (64), `RouteItemSchema` (72), `LayerSchema` (79), content (104), `projection.type` literal `'equirectangular'` (109), `legend.items` (121). |
| Scene types | `packages/geomap-engine/src/scene/types.ts` | `GeoMapSemanticRole` enum; `SceneNode` fields (id, role, kind, geometry, bounds, path, points, hidden, interactive, acceptsActions, metadata, children). |
| Scene build | `packages/geomap-engine/src/scene/build.ts` | Route segments hardcoded `interactive:false` (154); only route node indexed in `semantics` (181); `centroidOf` (28); legend items (239); NO propagation of `categories`/`adjacentTo`/`measure`/`linkedEntities` into metadata. |
| Projection/layout | `src/layout/projection.ts`, `engine.ts` | `Projector` interface; `makeProjector('equirectangular', …)`; `layout()` signature has no projection type; `fitViewport` (padding 0.08). |
| Semantic validation | `src/validation/semantic.ts` | Duplicate equirectangular-only rejection (38-40) beyond Zod. |
| Engine runtime | `packages/geomap-engine/src/engine.ts` | `recompute()` only at instantiate (141); `dispatch` (180): baseReducer → interaction-started → state-changed → `geomap.entity-*` → interaction-completed; `resultSuffix` (161); `findEntityPayload` (168) reads `laidOut.semantics[targetId].metadata` for select/focus only. |
| SVG + a11y | `src/render/svg.ts`, `render/types.ts` | `nodeToSvg` (17), route polyline (30), region path (47), alternative rows built in `svgFrom` walk (120-133), `EntityRow` (8). |
| Shared envelope | `packages/interactive-engine/src/schemas/actions.ts`, `runtime/reducer.ts` | Closed D5 `ACTION_TYPES`; `reducer.ts:80-83` step is global + pause-gated, `:90` scrub is passthrough, `:51-59` toggle writes `expanded[]`. |
| E2E harness | `apps/conformance/src/main.ts` | `__geomapHarness` = `__harness` + `extras` (`svg()`, `alternative()`); default fixture `odisha-coastal`. |
| Golden tests | `packages/geomap-engine/test/golden.test.ts` | `GENERATE=1` rewrites `expected.{scene,svg,a11y,alternative}`; `FIXTURES = ['region','marker','route','odisha-coastal']`; also docs `skill-example`. |
| JSON Schemas | `packages/geomap-engine/src/schemas/geomap-spec.schema.json` + `docs/schemas/geomap-spec.schema.json` | Must stay in sync with Zod (parity test imports the former). |

Node-id convention (document in SPEC §8/§21): layers `geom-<layerId>`; entity items `geom-<layerId>-<entityId>`; routes `geom-<layerId>-<routeId>`; segments `geom-<layerId>-<routeId>-seg-<i>`; legend items `geom-legend-item-<i>`; scale bar `geom-scale-bar`.

---

## 4. Phased implementation (each phase ends green)

Run package-scoped commands from `packages/geomap-engine` or `pnpm --filter @knowledgeassemble/geomap-engine …`.

### Phase 0 — Schema & JSON Schema parallelism (small, do first)
1. `src/schema.ts`:
   - `RouteItemSchema` += `interactive: z.boolean().optional()`, `label: z.boolean().optional()`.
   - `EntitySchema` += `categories: z.array(z.string()).optional()`, `adjacentTo: z.array(z.string()).optional()`.
   - `ItemSchema` += `measure: z.object({ attribute: z.string(), value: z.number() }).strict().optional()`.
   - `LayerSchema` += `encoding: z.object({ attribute: z.string(), type: z.enum(['fill','size']), breakpoints: z.array(z.tuple([z.number(), z.number()])).min(1) }).strict().optional()`.
   - `projection.type`: `z.enum(['equirectangular','mercator','albers'])` (default equirectangular when absent).
   - Content += `scaleBar: z.object({ visible: z.boolean().optional(), unit: z.enum(['km','mi']).optional() }).strict().optional()`.
   - Legend item schema += `linkedEntities: z.array(z.string()).optional()`, `interactive: z.boolean().optional()`.
2. Mirror ALL of the above into BOTH `src/schemas/geomap-spec.schema.json` and `docs/schemas/geomap-spec.schema.json` (`additionalProperties:false` everywhere; `projection.type.enum` now 3 entries).
3. Update `test/schema-parity.test.ts:34` projection expectation to `['equirectangular','mercator','albers']`; add parity assertions for `scaleBar.unit`, `encoding.type`.
4. **Tests first:** Zod rejection test for unknown content keys (strict still holds on new fields); positive parse for the new fields.
5. Gate: `pnpm test` (schema-parity), `pnpm typecheck`.

### Phase 1a — Derived render pipeline + layer containers + d3 projection + goldens
1. `scene/types.ts`: `GeoMapSemanticRole` += `'layer'`, `'scale-bar'`, `'route-completed'`, `'route-active'`.
2. `scene/build.ts`:
   - Wrap each non-route layer's items in a container `geom-<layerId>` (`role:'layer'`, `kind:'layer'`, `hidden: layer.visible === false`, not interactive, excluded from the a11y/interactive lists).
   - Routes: `interactive = item.interactive === true` gates segment interactivity; index every interactive segment in `semantics` (R8).
   - Propagate authored metadata into node `metadata`: `categories`, `adjacentTo`, `measure` on entity items; `linkedEntities` on legend items (this is the build change Phase 2's legend-link depends on).
   - Replace `centroidOf` with `d3.geoCentroid` (Point short-circuit kept).
3. Projection plumbing:
   - `layout/projection.ts`: implement `makeProjector(type, width, height, options)` over d3; keep `Projector` interface + `fitViewport` semantics (padding 0.08); add `mercator`/`albers`.
   - `layout/engine.ts:74`: `layout(scene, ctx, viewport, projectionType)` — read `content.projection.type`, pass through; no other math changes (layer containers recurse naturally in `assignBounds`).
   - `validation/semantic.ts:38-40`: widen the hand-rolled check to the new enum (reject only types outside it, still `INVALID_ENTITY`).
   - `test/validation.test.ts:75`: change the unknown-projection fixture to `orthographic` (mercator is now valid).
4. `scene/derive.ts` (NEW): per D2/D1 — `deriveDisplay(maps, state, laidoutBase)`. Handles layer toggles, route-step roles, filter hiding, legend emphasis. (Scale-bar + encoding hooked in Phase 1b/4.)
5. `engine.ts`: new pipeline (cache authored → laid-out base; per dispatch `baseReducer` + D1 maps + `deriveDisplay` + `svgFrom`); `snapshot().displayState` per D1. (Event emission for the new namespaced events lands in Phase 1b.)
6. `render/svg.ts`: layer `<g>` container rendering; `data-oedu-state` for route-completed/route-active; interactive segments emit `data-oedu-interactive` with a wide invisible hit path (stroke-width ≥ `minTouchTarget`).
7. **Tests first:** `test/derive.test.ts` — toggle hides/shows recursively; filter hides others; reset clears all maps; determinism (same dispatch sequence twice → identical scene JSON); no mutation of base or state.
8. **Golden regen:** `GENERATE=1 pnpm test -- golden`, then review `git diff` on all `expected.{scene,svg,a11y,alternative}` for `region`,`marker`,`route`,`odisha-coastal` + `docs/fixtures/geomap/skill-example`. Float-level noise only.
9. Gate: `pnpm test && pnpm typecheck && pnpm lint`.

### Phase 1b — Scale bar + dispatch events + e2e
1. `scene/derive.ts`: attach `geom-scale-bar` node per D5; `svg.ts` renders it; alternative list gains a kind `scale-bar` row; `snapshot().scaleBar` per D5.
2. `engine.ts` events: `toggle` → `geomap.layer-toggled`; `step`/`scrub` → `geomap.route-step`; `filter`/`clear-filter` → `geomap.filter-applied` (payloads exactly per D1; categories resolved to `ids` before emission). `emit()` unchanged.
3. **Tests first:** scale-bar determinism + snapshot field + alternative row; event payloads for all four namespaced events; category-filter resolution.
4. **E2E updates** (`e2e/geomap.spec.ts`): projection-rejection fixture → `orthographic` (R4); add toggle-layer → `geomap.layer-toggled` + SVG drops the sublayer node ids; `tryCreate` still rejects unknown content keys.
5. Gate: package tests `+` `pnpm playwright` (geomap spec) on the conformance server.

### Phase 2 — linear-feature, adjacency, legend-link
1. Verify interactive river/road as a `route` with `interactive: true` (build/derive already wired in Phase 1a): selecting a segment dispatches `geomap.entity-selected` with that entity's record (segment indexed in `semantics`).
2. `engine.ts`: on `focus` of `geom-legend-item-<i>`, emit `geomap.legend-linked` (payload `{ legendItemId, entityIds }` from its `metadata.linkedEntities`); `derive` sets `metadata.emphasis` on linked entities.
3. Alternative list: `adjacentTo` enumerated per entity row (add `adjacentTo?: string[]` to `EntityRow`).
4. **New fixture `fixture/linear/`** (interactive river route through two regions; regions carry `adjacentTo`). Goldens (`GENERATE=1`).
5. **Tests first:** segment-select → `geomap.entity-selected`; alternative row includes `adjacentTo`; legend focus → `geomap.legend-linked` + emphasis flags.
6. Gate: package tests green.

### Phase 3 — filter-category, layer-visibility, route-step (display-state verify + fixtures)
1. Display-state actions verified end-to-end (derive + events landed in 1a/1b): `fixture/overlay/` (two region layers, same basemap — risk-zone/boundary pair), `fixture/route-step/` (one route, `scaleBar` on, 4 segments). Goldens.
2. **Replay test:** replaying the exact dispatch sequence from `events()` reproduces the identical `laidOut` + `displayState` (P4; fixes the R3b snapshot-consistency risk).
3. SPEC §30: add `toggle` to the documented GeoMap D5 subset; document all four namespaced events + `geomap.entity-selected/focused`. (SPEC §36/§37/§64 handled in Phase 5.)
4. Gate: package tests green.

### Phase 4 — attr-encoding
1. `derive.ts`: bucket `measure.value` via closed mapping; set `metadata.encodingBucket = 'encoding-bucket-<n>'`; empty `measure`/`encoding` layers unaffected.
2. `svg.ts`: `data-oedu-encoding="encoding-bucket-<n>"` on region `<path>`/marker `<circle>`; size encoding: marker `r` scaled within bucket bounds (min 6 px, max 26 px, deterministic). `data-oedu-role` unchanged.
3. Auto-legend: append bucket entries ("`<attribute>`: [lo–hi)") after authored items with the same `data-oedu-encoding` attr.
4. **New fixture `fixture/encoding/`:** 5 synthetic regions with `measure.value` + 3 breakpoints + `categories` (enables filter + encoding in one fixture). Verify contiguous buckets, `data-oedu-encoding` on every encoded node, auto-legend emitted.
5. **Accessibility test:** encoded nodes still carry `aria-label` + numeric `measureValue` in the alternative row (nothing conveyed by color alone, P6).
6. Gate: package tests + lint green.

### Phase 5 — Documentation, catalog sync, full gate
1. **Catalogue sync** (`docs/use-cases/geomap.md`):
   - Fix the interaction-modes `attribute-view` row: drop the never-planned `geomap.theme-view` event; say "display-state feature (layer `encoding` present); interactions surface via `geomap.entity-*`".
   - Filter rows (`gm-dist-3`, `gm-r4`): replace "category payload" ambiguity with the D1 payload contract (`{ categories }` or `{ ids }`).
   - `gm-hist-1` / `gm-hist-3` `New capability` rows: `layer-visibility` + Timeline composition (not `period-slice`).
   - **Done flips — evidence over assertion, fixture + test required** (use-case → fixture → test):
     - `gm-scale-1-scale-bar` → `fixture/route-step` (scaleBar) → `derive.test.ts` scale-bar + `golden.test.ts`
     - `gm-leg-1-match-symbol` → `fixture/linear` (legend w/ linkedEntities) → legend-link test
     - `gm-dir-1-borders`, `gm-nav-2-locate-in-region` (engine slice: `adjacentTo` rows) → `fixture/linear` → alternative `adjacentTo` test
     - `gm-loc-1-linear-feature`, `gm-move-2-trade-route` → `fixture/linear` → segment-select test
     - `gm-move-1-trace-journey`, `gm-t2-trace-route` → `fixture/route-step` → route-step events test
     - `gm-dist-1-theme-identify`, `gm-dist-3-filter-category`, `gm-r4-filter-regions` → `fixture/encoding` → encoding + filter tests
   - **Keep `planned`** (acceptance NOT fully engine-satisfiable in this slice): `gm-scale-2` (host nearest-neighbour), `gm-nav-1` (host compass chrome), `gm-dist-4` (no size-encoding fixture scheduled — add one only if time), `gm-cmp-*`, `gm-ovl-1…3` (need encoding on BOTH of two overlaid layers; Phase 3 overlay fixture is plain layers only), `gm-move-3` (multi-route network), `gm-move-4`, `gm-hist-*`, `gm-inq-*`, `gm-asm-1/2`, all `construct-mark` cases (`gm-mark-*`, `gm-inq-2`, `gm-asm-3`) — deferred.
   - Contract-changes section: cross-reference each landed capability to its SPEC § and fixture.
2. **SPEC.md** (`docs/engines/geomap/SPEC.md`):
   - **Rewrite §36 (Timeline) and §37 (Temporal Layers) to composition-only**: GeoMap has NO internal timeline; `SPEC.md:1297` "engine determines visibility based on the active timeline state" is REMOVED. Add §64 pattern: host listens for Timeline events → routes `toggle` to GeoMap → `geomap.layer-toggled`.
   - §8/§21 node-id convention; §10 projection enum + semantic config example; §30 action subset incl. `toggle` + all five namespaced events; new content fields (`scaleBar`, `encoding`, `measure`, `categories`, `adjacentTo`, `linkedEntities`, route `interactive/label`).
   - Keep `docs/schemas/geomap-spec.schema.json` synced with the code schema (re-run parity).
3. **Source-plan pointer:** add a one-line staleness notice at the TOP of `docs/PLAN-GEOMAP-P8.md`: "Action names in this doc (`geomap.toggle-layer` etc.) are superseded — implement from `docs/PLAN-GEOMAP-P8-EXECUTION.md` only (D1 reuse-D5 rule)."
4. Full exit gate from repo root:
   `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`
5. Commit per phase (history is the review trail): `P8 geomap: schema + parity (encoding/scale/categories/adjacentTo/route)`, `P8 geomap: derived display pipeline + d3 projection + goldens`, `P8 geomap: scale bar + dispatch events + e2e`, `P8 geomap: linear-feature/adjacency/legend-link`, `P8 geomap: layer-visibility + filter + route-step fixtures`, `P8 geomap: attr-encoding`, `P8 geomap: SPEC/catalog sync + full gate`.

---

## 5. Guardrails (agent must obey)

- **Do not edit `packages/interactive-engine/src/schemas/actions.ts`.** Reuse `toggle`/`step`/`scrub`/`filter`/`clear-filter`/`reset`; namespace only the EVENTS (`geomap.layer-toggled`, `geomap.route-step`, `geomap.filter-applied`, `geomap.legend-linked`, plus existing `geomap.entity-selected/focused`).
- **Display state derivation (R3b):** never read `state.expanded`, `state.step`, or `state.playback` to decide layer visibility / route steps. Use the D1 event-fold (or local maps reset on `reset`) and expose `snapshot.displayState`.
- I never hand-write `expected.*` golden files — only `GENERATE=1` + review. Never accept structural golden changes silently.
- `.js` import specifiers (NodeNext/TS2835); strict TS + `noUncheckedIndexedAccess` (`arr[i]` is `T | undefined`).
- Only new runtime dependency: `d3-geo`. `deriveDisplay` pure/deterministic — no randomness, timers, Date, `Math.random`.
- Invariants: no literal colors; bucket role `encoding-bucket-<n>` ONLY (never `bucket-<n>`); authored data carries `sources` (P9); `additionalProperties:false` on every new schema object.
- Skip `construct-mark` (`gm-mark-*`, `gm-inq-2`, `gm-asm-3`) — separate design doc.
- No camera (zoom/pan) work; no Timeline import inside GeoMap; no `geomap.theme-view`/`geomap.encoding-view` event.

---

## 6. Out of scope (explicit)

- `construct-mark` & learner-authored entities (`gm-mark-*`, `gm-inq-2`, `gm-asm-3`).
- Runtime camera (zoom/pan re-layout) and dynamic scale-bar rescaling.
- Internal timeline (`period-slice`) — composition-only (SPEC §36/§37 rewritten in Phase 5).
- Multi-layer attr-encoding overlay (`gm-ovl-*`), size-encoding fixture, multi-route networks (`gm-move-3/4`) — follow-up workstreams.
- Chart/Diagram/Timeline/Visual changes.