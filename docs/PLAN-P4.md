# Phase 4 — GeoMap Engine: Detailed Implementation Plan

**File:** `docs/PLAN-P4.md`
**Status:** Detailed task breakdown for the P4 phase (supersedes nothing; expands `docs/PLAN.md` §4 P4)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P4
**Do this first:** read, in order — `docs/DESIGN.md` (§4, §5, §8, §9, §11, §12.1, §15 D9, §16), `docs/INTERACTIVE-ENGINE-SPEC.md` (§7.1–§7.4, §22, §67, §68–§69, §82), `docs/engines/geomap/SPEC.md` (whole — the normative reference, currently a Draft; this file freezes the P4 slice of it), `docs/engines/geomap/VISION.md` (context only — stay Frozen, do not enshrine prose), `docs/PLAN.md` (§4 P4, §10 status board), `docs/PLAN-P2.md` (scene/layout/render/validation conventions and the P2 API you mirror), `docs/PLAN-P2.5.md` (composition + namespaced-event conventions; the timeline stub you model `links` payloads on), `docs/PLAN-P3.md` (the closest template — the chart-engine plan this one mirrors). These are normative or load-bearing references; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Build `packages/geomap-engine` — the third real engine package (`EngineType 'geomap'`) on top of `@knowledgeassemble/interactive-engine` — and prove a **region → marker → route** vertical slice end-to-end with **GeoJSON data binding** (PLAN.md §4 P4 scope item 2): spec → schema → semantic scene → deterministic projection/layout → accessible SVG → alternative (list/table) view → geographic validation → golden fixtures → browser conformance. Displayed coordinates, projection math, bounds, and label placement are **derived layout**, never authored semantics (DESIGN §8/P2). Geographic ground truth comes **only** from declared GeoJSON sources and entity geometry (DESIGN §9) — the engine never invents boundaries, values, or facts.

**Non-goals (hard). Do NOT:**
- Build `flow`, `heatmap`, `animation`, `timeline`, `assessment`, or map-`scenes`/storytelling layers at P4. Those are geomap SPEC §83 "Phase 2" and are future phases on the same envelope — review-reject any of them in a P4 PR (DESIGN §15). Educational interactions (`locate`/`identify`/`trace`) are expressed via D5 actions on selectable entities, not new layer kinds.
- Build Timeline/Diagram/Visual behavior or Chart kinds. D9 — no engine smuggling.
- Import any peer engine package or `@open-edu/*` (D2/§6). `geomap-engine` depends only on `@knowledgeassemble/interactive-engine` + `zod`.
- Build a GIS surface: projection categories beyond the P4-closed set, pan/zoom navigation, map services (Mapbox/Leaflet/OpenLayers/Cesium), terrain, WebGL, 3D globe, remote network fetching of geography (SPEC §81, §84).
- Use d3, **d3-geo**, or any geo library. The equirectangular projection, bounds fitting, and label placement are hand-written pure functions — deterministic (P4).
- Use wall-clock time, `Math.random`, `Date.now`, or any non-determinism in scene/layout/SVG (P4). Determinism is tested, including a two-run byte-identical fixture.
- Add arbitrary JS, event handlers, `javascript:` URIs, or document/`on*` attributes to any spec or emitted SVG (P2/P10, geomap SPEC §80). GeoJSON `properties` values are sanitized to JSON primitives.
- Invent data or geometry. All plotted geography comes from `content.geography.sources[]` (GeoJSON) + declared `entities`; nothing is aggregated, synthesized, or defaulted (DESIGN §9, SPEC §67 MUST NOT "invent geographic boundaries"). Provenance classes on `sources[]` (envelope) are required.
- Author pixels. `content` carries semantic geography only: `viewport` framing, `projection`, entity ids/types, GeoJSON, layer membership, semantic `style.role`. No `x`/`y`/`width`/`fill` values at the spec surface.

**Non-negotiables (carried from P1–P2.5, extended for GeoMap).**
- `additionalProperties:false` on the geomap schema AND on every nested object — `content`, `viewport`, `projection`, `sources[]`, `entities[]`, `layers[]`, `items[]`, `legend`, `style`. The single documented exception is GeoJSON `properties` maps (free-form by the GeoJSON format; sanitized in the L2 semantic hook's geographic tier, see §2 rule 8).
- Shared §67 error codes only: `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Never bespoke (`UNKNOWN_ENTITY`, `BAD_GEOMETRY`, … are banned — SPEC §58's `UNKNOWN_ENTITY` example is NOT a §67 code).
- D5 semantic actions only (`select`, `deselect`, `focus`, `filter`, `clear-filter`, `reset`, …), drawn from the shared `ACTION_TYPES`. No `click`/`hover`/`pointer.*` in specs (SPEC §29). Renderer input maps outside the spec.
- Event-only mutation through the shared reducer/`EventLog`; namespaced result events `geomap.<…>` per §82; the log stays serializable and replayable (P4).
- Semantic-first: specs describe meaning (entities, layers, GeoJSON), never `x`/`y`/`zoom`/pixels. Explicit geometry is not part of the geomap spec surface.
- SVG is a compiled artifact; the canonical source is the semantic scene (visual ARCHITECTURE §2).
- **Alternative view is a first-class L4 output** derived from the same semantic model (geomap SPEC §45) — nothing is conveyed by shape/color alone; the a11y exit criterion is "a11y of **map semantics**, not raw SVG" (PLAN §4 P4).

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P3 must be landed and its gate green

P4 is written ahead of P3; it MUST NOT execute run until P3 is DONE and its §4 gate is green (PLAN.md §2 "phases are promoted one at a time"). Before any P4 work:

1. `main` posts the P3 merge (`@knowledgeassemble/chart-engine` landed); full gate green on `main`:
   `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
2. `docs/PLAN.md` §10 shows P3 `DONE` and §11 has the P3 lines + Chart-D1…Chart-D5 (verified — do not re-do).
3. Confirm the P4 **geomap** docs state: `docs/engines/geomap/SPEC.md` is a **Draft** (2834 lines, wide surface) — it stays the normative *reference*; this plan's §2 freezes the thin **P4 slice** of it in a reviewer-aware way (T0 records the freeze; T8 lands any SPEC status edit). `docs/engines/geomap/VISION.md` (Foundational, 0.1.0) stays **Frozen** — context only. `docs/schemas/geomap-spec.schema.json` does **not** exist yet — it is authored at T1.

If anything above is red, stop and fix it first. P4 builds on the chart engine's pipeline conventions and P2.5's namespaced-event/`links` payload patterns and must not paper over a failing gate.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p4-geomap-engine
```

Commit per task with repo style (`P4 T<nn>: <one-liner>`). Open a PR against `main`; land with `gh pr merge <n> --merge --delete-branch`. `main` is PR-protected — no direct pushes.

### 1.3 Grounded current state (verify on disk before writing code)

| Asset | Location | Status |
|---|---|---|
| GeoMap normative spec | `docs/engines/geomap/SPEC.md` | **Draft** (2834 lines). Normative reference; P4 freezes a thin subset (§2 + GeoMap-D1). §82 lists MVP scope; §83 lists Phase 2 (excluded here) |
| GeoMap vision | `docs/engines/geomap/VISION.md` | Foundational 0.1.0 — **Frozen**; context only at P4 |
| GeoMap JSON schema | `docs/schemas/geomap-spec.schema.json` | **Missing — authored at T1** (mirror `visual-spec.schema.json` conventions) |
| Core public surface | `packages/interactive-engine/src/index.ts` | `Engine`/`EngineRegistry`, `runPipeline`/`ValidationResult`, `validateEnvelope`, `EventLog`, `baseReducer`/`initialState`, `EngineError`/`ERROR_CODES`, `ACTION_TYPES`, `A11yNode`/`a11yTreeOf`, `EngineHost` (`locale`, `tokens`, `reducedMotion`, `announce`, `onEvent`, `resolveAsset`) |
| Pipeline template | `packages/visual-engine/` and `packages/chart-engine/` | `schema.ts`/`schemas/*.json`/`scene`/`layout`/`render`/`validation`/`engine.ts` + `fixture/…` + `e2e/*.spec.ts` — mirror this shape |
| Thin-engine template | `packages/timeline-engine/` | `schema.ts`/`engine.ts`/`reducer.ts`/`index.ts` — deps/scripts/`.js`-specifier discipline; `TIMELINE_EVENT_SELECTED` namespaced payload with `links` |
| GeoMap registry slot | `packages/interactive-engine/src/core/engine.ts:8` | `EngineType` already includes `'geomap'` — no core change needed; the engine package registers on instantiation |
| Conformance app | `apps/conformance/src/main.ts` + `chart.ts` (post-P3) + `composition.ts` | `?engine=core|visual|composition|chart` routes; `window.__harness`/`__visualHarness`/`__compositionHarness`/`__chartHarness`; add `?engine=geomap` |
| Engine e2e home | `packages/visual-engine/e2e/`, `packages/chart-engine/e2e/` | engine-package convention (composition's `apps/conformance/e2e/` is the exception) — geomap e2e lives in `packages/geomap-engine/e2e/` |
| Agent skill convention | `docs/engines/<engine>/skills/<name>/SKILL.md` | visual/composition/skill homes; geomap home mirrors |

### 1.4 Decision gates to close at T0 (record in `docs/PLAN.md` §11 change log before implementing)

- **GeoMap-D1 — Closed P4 layer/entity sets.** Timeline-relative to the Draft SPEC's wide surface: layer type is a closed enum `["region","marker","route","label"]`; entity `type` is a closed enum `["country","state","province","region","city","town","village","river","lake","mountain","landmark","place"]`. `flow`/`heatmap`/`animation`/`timeline`/`areas` (`assessment`, `scenes`) are **future** (SPEC §83) and OUT of the P4 schema enum and scene builder. If a reviewer pushes back, the fallback is a plan note, never a silent widening.
- **GeoMap-D2 — One deterministic projection.** `content.projection.type` is a closed enum `["equirectangular"]` at P4 (SPEC §10's `geographic/mercator/equal-area/orthographic/custom` collapse to `equirectangular` — the only fully deterministic, hand-writable choice with correct lat/lon linearity). `viewport.fit` is `"content"` (deterministic bbox of all geometry + fixed padding) with optional `center`/`zoom` override. **No d3-geo.** Byte-deterministic.
- **GeoMap-D3 — Namespaced result events.** `select` of an entity emits `geomap.entity-selected`; `focus` emits `geomap.entity-focused`. The payload carries the **full resolved entity record** (`id`, `type`, `name`, `description?`, resolved `location`/geometry reference, `links?`) — mirroring the timeline Gap-B / chart Chart-D3 convention so a future composition binding can resolve `targetIdFrom` off `links.*`.
- **GeoMap-D4 — Geographic ground-truth binding.** Entity location binds EITHER to a `{ source, featureId }` pair that MUST resolve inside a declared GeoJSON source, OR to explicit `{ coordinates: { lat, lon } }`. Route `path` entries reference entity ids whose geometry MUST be point-like. Any unresolved reference → `INVALID_REFERENCE`; any value outside `.featureId`/lat (`[-90,90]`)/lon (`[-180,180]`) or a structurally invalid GeoJSON → `INVALID_ENTITY`. This is the mechanism behind PLAN exit criterion 2 ("invented boundary/value fails validation").

---

## 2. The GeoMap specification contract (author this first)

Author `docs/schemas/geomap-spec.schema.json` (canonical) + Zod mirror in `packages/geomap-engine/src/schema.ts`, from geomap SPEC §7–§30 restated in the shared envelope (D1 — no `{ "geomap": {} }` wrapper, no `schemaVersion`). Target content shape (this is the thin, gated subset of the Draft — `viewport`/`projection`/`geography`/`entities`/`layers`/`legend` ONLY; the Draft's `interactions`/`animations`/`timeline`/`assessment`/`theme` are out per GeoMap-D1 and envelope D1):

```jsonc
{
  "type": "geomap",                       // envelope; L1 via interactive-engine.schema.json
  "version": "1.0.0",
  "id": "odisha-coastal",
  "metadata": { "title": "Odisha and its coastal neighbours" },
  "purpose": { "learningObjective": "Locate Odisha, its capital, and its coastal connections", "reasoningMode": "locate" },
  "content": {
    "viewport": { "fit": "content", "padding": 0.08 },
    "projection": { "type": "equirectangular" },
    "geography": {
      "sources": [
        {
          "id": "india-states",
          "type": "geojson",              // type is literal "geojson"
          "class": "authoritative",       // provenance (DESIGN §9; SPEC §11/§15)
          "data": { "type": "FeatureCollection", "features": [] }   // inline, deterministic; OR "uri" resolved via host.resolveAsset
        }
      ]
    },
    "entities": [
      { "id": "odisha", "type": "state", "name": "Odisha",
        "description": "A state on the eastern coast of India.",
        "location": { "source": "india-states", "featureId": "odisha" } },
      { "id": "bhubaneswar", "type": "city", "name": "Bhubaneswar",
        "location": { "coordinates": { "lat": 20.2961, "lon": 85.8245 } } }
    ],
    "layers": [
      { "id": "states", "type": "region", "items": [ { "entity": "odisha", "interactive": true } ] },
      { "id": "cities", "type": "marker", "items": [ { "entity": "bhubaneswar", "label": true } ] }
    ],
    "legend": { "visible": true, "items": [
      { "role": "primary-region", "label": "State" },
      { "role": "marker", "label": "City" }
    ] }
  },
  "interaction": { "mode": "explore", "actions": ["select", "deselect", "focus", "reset"] },
  "questions": [],
  "sources": [{ "class": "authoritative" }],   // provenance (DESIGN §9)
  "accessibility": { "label": "Map of Odisha, its capital Bhubaneswar, and coastal connections." }
}
```

A route layer membership example (route `path` references entity ids):

```jsonc
{ "id": "coast-route", "type": "route",
  "items": [ { "id": "odisha-coast", "path": ["vizag", "bhubaneswar", "chilika"] } ] }
```

Rules to encode in the schema + Zod (`additionalProperties:false` at every level except GeoJSON `properties`):

1. `content` is closed to `viewport`, `projection`, `geography`, `entities`, `layers`, `legend` (each optional unless the selected feature requires it, SPEC §7). Unknown key or known-but-deferred key (`animations`, `timeline`, `assessment`, `scenes`, `flows`, `theme`) → schema error at L1; semantically `INVALID_SPEC`.
2. `projection.type` — closed enum `["equirectangular"]` (GeoMap-D2); `viewport` — `fit:"content"` + `padding` (0–0.5) and/or `center {lat,lon}` + `zoom`, all validated ranges; mutually-consistent center/zoom with ranges (`lat ∈ [-90,90]`, `lon ∈ [-180,180]`, `zoom ∈ [0, 20]`).
3. `geography.sources[]` — `{ id (id-pattern, unique), type: literal "geojson", class ∈ {authoritative,illustrative,simulated}, data?: GeoJSON, uri?: string }`. At least one of `data` | `uri`; `uri` resolves via `host.resolveAsset` (synchronous; `RESOURCE_ERROR` if unresolvable). Source ids unique and referenced by entities.
4. `entities[]` — `{ id (id-pattern, unique), type ∈ ENTITY_TYPES (GeoMap-D1 closed set), name (non-empty string), description?, location, links?: Record<string,string> }`. `location` is exactly one of `coordinates` | `source+featureId` (SPEC §14). Entity ids unique; referenced by layers.
5. `layers[]` — `{ id (unique), type ∈ LAYER_TYPES (GeoMap-D1 closed set), title?, visible?, style?: { role?: ROLE_TYPES | "approximate" }, items[] }`. `items[]` closed per layer type: region/marker → `{ entity, label?, interactive? }`; route → `{ id, path: string[] }`. Item `entity` refs must exist (`INVALID_REFERENCE` at L2); route `path` ≥ 2 distinct entity ids that resolve to point geometry (`INVALID_ENTITY`).
6. Semantic styling only: `style.role` draws from a closed token set (`primary-region`, `secondary-region`, `marker`, `route`, `label`, `highlight`, `selected`, `approximate`) mapped to `EngineHost.tokens` at render; **no `fill`/`stroke`/`color` authored in specs** (SPEC §26, DESIGN §12.1).
7. Provenance: envelope `sources[].class` ∈ `{authoritative,illustrative,simulated}` (DESIGN §9); the geometry below a claim is authoritative only if its source is `authoritative`. `simulated`/`illustrative` geometry renders with its derived `role` and is never presented as exact. The engine never synthesizes geometry — nothing renders that is not in `geography` or `entities`.
8. **GeoJSON `properties` free-form exception:** a source's GeoJSON `properties` maps may carry arbitrary JSON keys (GeoJSON spec), but values are sanitized to primitives (string/number/boolean/null/arrays/objects without `function`/`script` content) in the L2 semantic geographic tier — no executable content (SPEC §80). Feature `id`s are used to match `featureId`; a feature MUST have a matching `id` for `source+featureId` binding.
9. Layer `<->` geometry kind compatibility (L2 semantic geographic tier, not schema): `region` items bind to `Polygon`/`MultiPolygon` features; `marker` items bind to `Point` features (or `coordinates`); `route` segments bind to point-like entities. Mismatch → `INVALID_ENTITY`.

Because the P1 core already runs L1 on the envelope, `GeoMapEngine.validate` reuses `runPipeline` and supplies its own **L2 semantic** (with the geographic tier folded in — no separate named hook), **L3 layout**, **L4 accessibility** hooks (mirroring `chart-engine`; the geographic tier is the SPEC §53 "Geographic" validation leg).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prereqs, decision-gating, geomap docs freeze
- Reconcile §1.1 (P3 landed; gate green). Branch per §1.2.
- Record GeoMap-D1…GeoMap-D4 (§1.4) in `docs/PLAN.md` §11 change log before implementation.
- Confirm `docs/engines/geomap/SPEC.md` is the normative reference; this plan's §2 + the four decisions ARE the P4 freeze. Do NOT expand `VISION.md` prose; do NOT port the Draft's wide surface (`animations`/`timeline`/`assessment`/`scenes`/`flows`) into the schema.

**Done when:** PLAN.md §11 has the four D4 decision lines; branch `feat/p4-geomap-engine` exists; `pnpm -w test` is green on the branch base.

### T1 — GeoMap-engine scaffold + schema + parity guardrail
- Create the package tree (mirror §1.3 pipeline template):

```text
packages/geomap-engine/
  package.json                 # name: @knowledgeassemble/geomap-engine; deps: interactive-engine + zod only
  tsconfig.json                # extends ../../tsconfig.base.json
  vitest.config.ts
  playwright.config.ts         # testDir ./e2e; webServer: pnpm --filter @knowledgeassemble/conformance dev (port 5173)
  src/
    index.ts                   # public exports (types + functions only)
    schema.ts                  # ENTITY_TYPES / LAYER_TYPES / ROLE_TYPES consts + GeomapSpecs Zod + types
    schemas/geomap-spec.schema.json   # canonical (authored here; also copy to docs/schemas/)
    scene/types.ts, scene/build.ts
    layout/projection.ts, layout/geometry.ts, layout/engine.ts
    render/types.ts, render/svg.ts
    validation/semantic.ts, validation/geographic.ts, validation/layout.ts, validation/accessibility.ts
    engine.ts                  # GeoMapEngine implements core Engine
  test/
    schema-parity.test.ts      # §5 guardrail
    schema.test.ts, scene.test.ts, projection.test.ts, layout.test.ts, render-svg.test.ts,
    validation.test.ts, instance.test.ts
  e2e/geomap.spec.ts           # Playwright (T7)
  fixture/{region,marker,route}/ + fixture/odisha-coastal/   # golden fixtures (T7)
```

- `package.json` scripts identical to `chart-engine`/`visual-engine` (`typecheck`, `lint` `eslint src test`, `test` `vitest run`, `playwright`). `pnpm install` links the workspace.
- Author `schemas/geomap-spec.schema.json` (canonical) per §2. Mirror in `src/schema.ts` with `z` (`.strict()` everywhere except a GeoJSON `properties` `z.record(z.unknown())` refined at L2). `LAYER_TYPES`/`ENTITY_TYPES`/`ROLE_TYPES` consts exported.
- **Parity guardrail** (`test/schema-parity.test.ts`): closed enums (sorted) match the consts; `content.additionalProperties === false` and every nested object is strict; `sources[].type` literal `geojson`; `projection.type.enum` === `["equirectangular"]`; provenance `class` enum equals `{authoritative,illustrative,simulated}`; no `makeItPretty|svgMagic|x|y|width|height|fill|stroke` in the content surface.

**Done when:** `pnpm --filter @knowledgeassemble/geomap-engine typecheck` green with `.js` specifiers; parity test green; the §2 example parses; `projection.type:"mercator"`, a `flow` layer, and an unknown `content` key all fail (`INVALID_SPEC`/L1–L2).

### T2 — Scene model + entity-resolution scene builder
Files: `scene/types.ts`, `scene/build.ts`.

- `scene/types.ts` — GeoMap `SemanticRole`: `'map' | 'layer' | 'region' | 'marker' | 'route' | 'route-segment' | 'label' | 'legend' | 'legend-item' | 'selectable' | 'group'`. `SceneNode`/`Scene` reuse the chart/visual conventions (`bounds?` set by layout, `acceptsActions?: ActionType[]`, `interactive?`, `geometry?`, `children[]`).
- `scene/build.ts` — `buildScene(content, sources): Scene`:
  1. Resolve every GeoJSON source (`data` inline or `uri` via `host.resolveAsset`) into a feature index; unknown/`geojson`-invalid feature + unresolved `featureId` → `INVALID_REFERENCE`; structurally bad geometry → `INVALID_ENTITY`.
  2. Emit per-layer scene nodes in declared layer order: `region` → `region` node per item with `geometry: { type: 'Polygon'|'MultiPolygon' }`, metadata `{ entityId, entityType, name, source, sourceClass, featureId }`; `marker` → `marker` node per item with point; `route` → `route` node with `path` of marker refs + per-segment children; `label` → `label` nodes.
  3. Deterministic ids: `geom-<layerId>-<entityId>` / `geom-<routeId>-<segmentId>-<n>`; null-entity-fallback zero-padded index; assert uniqueness (`INVALID_ENTITY` on duplicates).
  4. Attach `links?` from the entity record onto the scene node metadata (composition seam, GeoMap-D3).
- Keep scene building **pure**: no projection, no bounds.

**Done when (test-first):** the §2 example yields region+marker nodes with correct resolved metadata; a route yields ≥ 2 segment nodes; missing feature → `INVALID_REFERENCE`; duplicate item id → `INVALID_ENTITY`; the scene never throws on well-formed data and never produces duplicate ids.

### T3 — Deterministic projection + layout engine
Files: `layout/projection.ts`, `layout/geometry.ts`, `layout/engine.ts`.

- `projection.ts` — pure functions (no d3-geo):
  - `makeProjector('equirectangular')` → `(lon, lat) → Point` mapped into a unit square then scaled to canvas; longitude linear, latitude linear (GeoMap-D2).
  - `bboxOf(geometries)` → `{ west, south, east, north }`; `fitViewport(bbox, canvas, padding)` → uniform scale (min of axis fits), centered, **byte-deterministic**; `centerZoom -> viewport` for the override path.
- `geometry.ts` — `Point/Rect`, `union`, `translate`, `polygonCentroid` (deterministic average of vertices, used for region labels), `pointInPolygon` (for the interaction map + L3 overlap).
- `layout/engine.ts` — `layout(scene, ctx): Scene` where `ctx` comes from `EngineHost.tokens` (`{ width, height, minTouchTarget, textStyle, }`, mirroring chart T3/T4). Assigns `bounds`: regions → projected polygon + label at centroid; markers → point projected, sized ≥ `minTouchTarget`; routes → polyline through projected marker centers; legend → derived strip; interactive nodes sized ≥ `minTouchTarget`. Pure: identical input → identical bounds.

**Done when (test-first):** `makeProjector('equirectangular')(0,0)` is the canvas center and `(lon,0)` moves exactly east at linear scale; `fitViewport` on the odisha fixture matches a literal asserted bbox/scale; determinism test (two identical calls byte-equal bounds); a `zoom`/`center` override is honored deterministically.

### T4 — SVG renderer + a11y tree + alternative view + interaction map
Files: `render/types.ts`, `render/svg.ts`.

- `svgFrom(scene, ctx): { svg: string; a11y: A11yNode[]; interactive: Array<{ id: string; action: ActionType }>; alternative: EntityRow[] }`.
  - Semantic SVG: `<svg>` with `<title>`/`<desc>` from envelope `accessibility`; `<g id="map-root">`, `<g id="map-layers">`, one `<g>` per layer; regions → `<path d="…" data-oedu-role="region">`, markers → `<circle>`/marker symbol, routes → `<path>`/`<polyline>`, labels → `<text>`; `id`/`data-oedu-entity` attributes; deterministic attribute order and id order (scene walk order).
  - **Security:** whitelisted attributes only (geo-specific: `d`, `cx`, `cy`, `r`, `fill` from token-mapped roles, `transform` never); no `<script>`, `on*`, `javascript:` (SPEC §80). **Determinism:** two runs byte-identical.
  - `a11y`: reuse core `A11yNode`; one node per interactive entity with mapped role and a non-empty `label` from entity `name` + `type` + `description` (+ entity `class`) — never empty; keyboard order `map → layer controls → entities → legend` (SPEC §46).
  - `alternative`: `EntityRow[]` from the **same** scene — `{ entityId, type, name, description?, location: resolved `coordinates` or source+featureId, sourceClass }` — the SPEC §45 alternative view (rendered by the conformance app as an accessible list/`<table>`, not by the engine).
  - `interactive`: entities with `acceptsActions` → the D5 action a renderer may dispatch (`select`/`focus`). Exposed for the host, never embedded.

**Done when:** golden `expected.svg` for the odisha fixture is generated and stable across two runs (determinism test); no `onclick`/`<script>`; `a11y` has labeled nodes for every interactive entity; `alternative` lists all entities exactly with resolved location + class; `interactive` maps each entity to `select`/`focus`.

### T5 — GeoMap validator (L2 semantic incl. geographic tier / L3 / L4 hooks)
Files: `validation/semantic.ts` (calls the geographic tier internally), `validation/geographic.ts`, `validation/layout.ts`, `validation/accessibility.ts` → plugged into core `runPipeline`.

- **L2 semantic** — `projection.type` ∈ `["equirectangular"]` (`INVALID_ENTITY`); entity/layer ids valid + unique (`INVALID_ENTITY`); layer items reference declared entities + route `path` ≥ 2 distinct, point-resolvable entities (`INVALID_REFERENCE`/`INVALID_ENTITY`); `style.role` ∈ closed set; `acceptsActions` ⊆ D5 (`INVALID_ACTION`); provenance `sources[].class` + envelope `sources[]` valid (`INVALID_SPEC`).
- **L2 semantic — geographic tier (internal to the semantic hook, not a separate named hook):** lat/lon ranges (`INVALID_ENTITY`); geometry structural validity (FeatureCollection, allowed geometry types Polygon/MultiPolygon/Point/LineString for route source features, features carry id for `featureId` binding) (`INVALID_ENTITY`); featureId/entity refs resolve (`INVALID_REFERENCE`); GeoJSON `properties` sanitized to primitives (`INVALID_SPEC`); layer↔geometry kind compatibility (`INVALID_ENTITY`). Self-intersection checking is explicitly deferred (SPEC future, note in code).
- **L3 layout** — after `layout(scene)`: all projected geometry inside canvas; no required-region overlap; interactive targets ≥ `minTouchTarget` (`INVALID_STATE` / `ACCESSIBILITY_ERROR` when a hard constraint, warning otherwise).
- **L4 accessibility** — envelope `accessibility.label` present; every interactive entity labeled; no color-only meaning (styled nodes without label/role distinction flagged); `alternative` non-empty and covers all entities.
- Hooks return `ValidationResult` and plug into `runPipeline(spec, { semantic, layout, accessibility })` — `ValidationHooks` has exactly those three slots; the geographic tier runs inside the `semantic` hook.

**Done when (test-first, negatives before the validator passes them):** §2 fixture → `valid:true, issues:[]`; an entity `featureId` absent from the source fails `INVALID_REFERENCE` (**data-fidelity / invented-value case**); an invented boundary polygon not in any declared source fails `INVALID_REFERENCE`; lat `91`/lon `-181` fails `INVALID_ENTITY`; a route with a 1-entity path or polygon-bound entity fails `INVALID_ENTITY`; a `mercator` projection and a `flow` layer fail `INVALID_ENTITY`; a color-only marker fails L4 `ACCESSIBILITY_ERROR`; an out-of-canvas layout fails L3 `INVALID_STATE`.

### T6 — GeoMapEngine facade + registry + namespaced events
Files: `engine.ts` (+ `test/instance.test.ts` registering in the core `EngineRegistry`).

- `GeoMapEngine implements Engine` (`type:'geomap'`): `validate(spec)` = `runPipeline` with the T5 hooks; `instantiate(spec, host, id?)` — validate (throw `INVALID_SPEC` on failure), resolve sources → build scene → layout → render, then wrap in an `EngineInstance` whose `dispatch` extends `baseReducer`:
  - `select` of an entity id → append `geomap.entity-selected` with `data` = the **full resolved entity record** (+ `links`) — GeoMap-D3.
  - `focus` → `geomap.entity-focused` likewise.
  - `deselect`/`filter`/`clear-filter`/`reset` via `baseReducer` only (no geo-specific payload invention). `zoom`/`pan` actions are accepted by `baseReducer` as state no-ops at P4 (see guardrail 10).
- `snapshot()` returns `EngineState` + read-only `scene`, `svgResult`, `alternative` (deterministically derived). Wire `EngineHost.tokens` → `LayoutContext`, `Host.locale` → text resolution, `Host.resolveAsset` → `uri` sources (`RESOURCE_ERROR` on failure).
- Import **only** the core public surface (`index.ts`); `.js` specifiers everywhere.

**Done when (test-first):** registry `get('geomap')` returns the engine; `instantiate(§2 spec)` → `dispatch({type:'select', target:{id:'…'}})` → `snapshot().selection` contains the id AND the emitted `geomap.entity-selected` carries the full entity record and `links` when present; an entity bound to a missing feature fails `instantiate`; `projection.type:"orthographic"` fails `validate`; event ids follow `<instanceId>:<seq>`.

### T7 — Golden fixtures + conformance tab + browser e2e
- Golden fixtures (`fixture/{region,marker,route}/` minimal per-layer slices + `fixture/odisha-coastal/` integrated slice used by conformance): `input.geomap.json`, GeoJSON `sources/*.geojson`, `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.alternative.json`, `validation.json`, fixture `README.md`. Asserted by snapshot tests (deterministic; re-running tests does not mutate them).
- Conformance `?engine=geomap`: `apps/conformance/src/geomap.ts` mirroring the chart route — register `GeoMapEngine`, load the odisha fixture, inject `svgFrom(...)` SVG into the DOM, render `alternative` as a real accessible list (or `<table>`) with `aria-label` — map semantics, not raw SVG — expose `window.__geomapHarness = { dispatch, snapshot, events, svg, alternative, tryCreate }`; route wiring in `apps/conformance/src/main.ts`.
- `e2e/geomap.spec.ts` (Playwright):
  1. **a11y** — SVG has `<title>`/`desc`; every interactive region/marker has a non-empty `aria-label`; the `alternative` list exists and lists all entities with resolved location + class (nothing color-only).
  2. **interaction** — keyboard/pointer activation of a region dispatches `select`; snapshot selection contains the entity id; `geomap.entity-selected` recorded with the full resolved entity.
  3. **replay** — events replay in `seq` order via core `EventLog` (monotonic; determinism).
  4. **data fidelity** — `tryCreate` of a spec with an entity `featureId` absent from its source fails with a shared code; an invented boundary polygon not in any declared source fails; lat/lon out of range fails.
  5. **rejection** — `projection.type:"mercator"`, a `flow` layer, and an unknown `content` key fail `tryCreate`.

**Done when:** all five specs green in a real browser against installed `geomap-engine` + `interactive-engine`.

### T8 — Agent skill + doc reconciliation + full exit gate
- Agent skill `docs/engines/geomap/skills/geographic-map/SKILL.md` (mirror the visual/chart skill homes) — when to use GeoMap vs a Visual component vs Chart; never invent boundaries/values/coordinates; provenance classes; `viewport`/`projection` (`equirectangular` only); entities/layers/GeoJSON binding shapes; derived layout (never author pixels); route `path` rules; alternative view; D5 interaction; validate-before-publish (SPEC §67).
- Bounded proof: the skill's canonical example JSON is checked in (e.g. `docs/fixtures/geomap/skill-example.json`) and round-trips `GeoMapEngine.validate` valid in a unit test.
- `docs/fixtures/geomap/README.md`: validation commands (`geomap-spec.schema.json` L1 + embedded `interactive-engine.schema.json` L1 env + L2–L4 through `GeoMapEngine.validate`) and the "no invented values/boundaries" rule.
- `docs/PLAN.md` §10 status board `P4 → DONE` **only after** the §4 gate is green; add §11 change-log lines (P4 DONE + the four D4 decisions). Flip `geomap/SPEC.md` status per T0 decision (record "P4 slice frozen" — e.g. add a Normative-at-P4 pointer in the SPEC header or leave the Draft as-is per reviewer preference).

**Done when:** full exit gate green (§4); PLAN.md status board + change log consistent.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P4 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | GeoJSON regions/markers/routes slice green (incl. a11y of **map semantics**, not raw SVG) | T4 golden `expected.{svg,scene,a11y,alternative}.json` + T5 validation + T7 `e2e/geomap.spec.ts` (a11y, interaction, replay) — the conformance tab renders `alternative` as a real accessible list/table |
| 2 | Data-fidelity test: invented boundary/value fails validation | T5 negative tests (entity `featureId` absent from source → `INVALID_REFERENCE`; invented boundary polygon → `INVALID_REFERENCE`; lat/lon out of range → `INVALID_ENTITY`) + T7 e2e spec 4 |

**Self-checks (all MUST pass, not just the two PLAN criteria):**
- **No engine smuggling (D9):** `grep -rn "from '@knowledgeassemble/\|@open-edu/" packages/geomap-engine/src` yields only `interactive-engine`; no `visual-engine|chart-engine|timeline-engine|diagram-engine` imports; no visual kinds and no `flow|heatmap|animation|timeline|assessment|scenes` in src except negative-test strings and documentation text.
- **Closed projections/sets:** `grep -rn "mercator\|orthographic\|equal-area\|mapbox\|leaflet\|cesium\|openlayers" packages/geomap-engine/src/schemas/geomap-spec.schema.json` → only `description` text, never an enum; `LAYER_TYPES`/`ENTITY_TYPES` exact match GeoMap-D1.
- **Deps:** `packages/geomap-engine/package.json` deps = `interactive-engine` + `zod`; no `d3-geo`/`d3`/map libraries.
- **Determinism:** two-run byte identical `expected.svg` test green; `grep -rn "Date.now\|Math.random\|performance.now\|d3-geo\|geoMercator\|geoNaturalEarth" packages/geomap-engine/src` → empty.
- **Shared error codes only:** thrown codes ⊆ §67 set (`grep -rn "'[A-Z_]*ERROR'\|'INVALID_'" packages/geomap-engine/src`); `UNKNOWN_ENTITY`/`BAD_GEOMETRY` never raised.
- **Semantic-first + ground truth:** no `x`/`y`/`pixel`/`fill`/`stroke` authored in specs; `grep` of every fixture `input.geomap.json` surfaces no geometry keys; every entity/layer/geometry traces to a declared source or `coordinates`; no synthesized geometry anywhere.
- **D6:** no store/i18n/studio/scoring modules; `questions` stay empty arrays in fixtures.

---

## 5. Schema ↔ Zod parity guardrail (T1 must include)

`test/schema-parity.test.ts` (geomap) asserts the canonical JSON Schema and the runtime Zod mirror stay in sync, per T1 §3 list — plus:
- `LAYER_TYPES`/`ENTITY_TYPES`/`ROLE_TYPES` (sorted) === the schema enum values (sorted).
- the SVG/a11y/alternative contract reciprocity: every interactive scene node appears in the a11y tree AND in `alternative` (parity between `render` map, `a11y`, and the alternative derivation).
- every fixture `input.geomap.json` for all four layer types round-trips `GeoMapEngine.validate` valid, and its `expected.*` files are byte-stable.
- a GeoJSON `properties` object with a function-valued key fails the L2 semantic geographic tier (the only sanctioned dynamic-key region, and only for primitives).

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not put React/DOM/map-view in `packages/geomap-engine`.** SVG is pure data; the alternative list/table is built in the conformance app, not the engine.
2. **Do not import peer engines or OpenEdu** (D2/§6). Only `@knowledgeassemble/interactive-engine` public surface + `zod`.
3. **Do not build Visual/Chart/Timeline/Diagram behavior, flow/heatmap layers, animations, internal timelines, or assessment** (D9 + GeoMap-D1). A layer type or `content` key outside the closed set is a contract violation — reject in review.
4. **Do not reach for d3, d3-geo, or any projection/map library.** The equirectangular projection and bounds fitting are hand-written pure functions; determinism (P4) is tested and a golden change requires fixture review.
5. **Do not invent geography.** Every plotted boundary/value comes from a declared GeoJSON source or entity `coordinates`; nothing is synthesized, simplified without provenance, or defaulted (DESIGN §9, SPEC §67).
6. **Do not author geometry.** No `x`/`y`/`width`/`zoom`/pixels or raw `fill`/`stroke` colors in specs; positions/roles are derived (GeoMap-D2); semantic `style.role` only. No LLM-pleaser props.
7. **Do not emit unsafe SVG or execute GeoJSON.** Whitelist attributes; never `on*`, `<script>`, `javascript:`; sanitize GeoJSON `properties` to primitives (SPEC §80).
8. **Do not use wall-clock/time/randomness anywhere** (P4). Determinism is tested with byte-identical fixtures.
9. **Use exactly the §67 codes** — unknown/unresolved feature/entity/boundary ref → `INVALID_REFERENCE`; bad kind/layer/geometry/range → `INVALID_ENTITY`; bad spec shape/deferred keys → `INVALID_SPEC`; bad action → `INVALID_ACTION`; layout infeasibility → `INVALID_STATE`; a11y gap → `ACCESSIBILITY_ERROR`; unresolvable `uri` asset → `RESOURCE_ERROR`.
10. **Namespaced events only.** `select` → `geomap.entity-selected`; `focus` → `geomap.entity-focused`; payload = full resolved entity (+ `links`). No per-entity event-name invention. `zoom`/`pan`/`filter` stay `baseReducer` state mapping — no geo-specific action or event payload invention.
11. **`.js` import specifiers + `src/index.ts` as the only public surface** of `geomap-engine`; deep imports into `interactive-engine` internals are forbidden (NodeNext).
12. **Test-first.** Every task T1–T7 starts with its failing test/fixture; "done" means that test passes (convention).
13. **Reuse, don't reimplement the event system.** Use core `baseReducer`/`EventLog`; geomap extends `baseReducer` for its two namespaced result events only.

---

## 7. Definition of Done (P4-specific)

P4 is complete when:

- `docs/PLAN.md` §4 P4 exit criteria 1–2 are green, verified by the §4 gate commands (not assertion).
- `packages/geomap-engine` passes `typecheck`, `lint`, unit tests, and browser e2e.
- `geomap-spec.schema.json` (1.0.0) is canonical and mirrored in Zod with the §5 parity guardrail green.
- The region → marker → route slice has byte-stable golden fixtures (`input.geomap.json`, `sources/*.geojson`, `expected.{svg,scene,a11y,alternative}.json`, `validation.json`) checked in.
- Conformance `?engine=geomap` works (SVG + accessible `alternative` list/table); the geographic-map skill example round-trips validation.
- `docs/PLAN.md` marks P4 **DONE**, logs the change (including GeoMap-D1…GeoMap-D4), and the geomap SPEC/VISION statuses match the T0 decision.
- `simulated`/`illustrative` sources render with derived roles and are never presented as authoritative; `authoritative` sources are only ever sourced from declared GeoJSON/coordinates.

Do **not** start P5 until the §4 gate is green.