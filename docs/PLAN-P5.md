# Phase 5 — Timeline Engine: Detailed Implementation Plan

**File:** `docs/PLAN-P5.md`
**Status:** Detailed task breakdown for the P5 phase (supersedes nothing; expands `docs/PLAN.md` §4 P5)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P5
**Do this first:** read, in order — `docs/DESIGN.md` (§4, §5, §8, §9, §11, §12.1, §15 D9, §16), `docs/INTERACTIVE-ENGINE-SPEC.md` (§7.1–§7.4, §22, §67, §68–§69, §82), `docs/engines/timeline/SPEC.md` (whole — thin, normative; it says "gates P5 implementation; expand in code, not prose"), `docs/engines/timeline/VISION.md` (context only — stay Frozen, do not enshrine prose), `docs/PLAN.md` (§4 P5, §10 status board), `docs/PLAN-P2.md` (scene/layout/render/validation conventions and the P2 API you mirror), `docs/PLAN-P2.5.md` (the composition + thin-stub conventions, the Gap-B `links` payload contract, and the golden event log you must not break), `docs/PLAN-P3.md` (the closest full-renderer template this one mirrors), and `packages/timeline-engine/src/**` + `packages/timeline-engine/test/timeline.test.ts` (the P2.5 **stub you upgrade** — read it before writing any code). These are normative or load-bearing references; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Upgrade the P2.5 **stub** `packages/timeline-engine` into the second-real-renderer **Timeline Engine** — the fourth real engine package. Prove an **events / periods / tracks** slice end-to-end (PLAN.md §4 P5 scope item 2): spec → schema → semantic scene → deterministic temporal scale/layout → accessible SVG → **linear accessible alternative** → validation → golden fixtures → browser conformance. **Playback** (`play-pause`, `step`, `scrub`) routes through the shared D5 action set and the core reducer — no engine-private playback API (PLAN §4 P5 scope item 3, DESIGN §7.4). The P2.5 composition contract is **preserved**: `content.kind:"events"`, `timeline.event-selected` carrying the full event record + `links` (Gap B), and the existing golden event log stay byte-stable.

**Non-goals (hard). Do NOT:**
- Author a Timeline **spec** surface beyond the P5-closed model. `content.kind` stays `"events"`; only `periods[]` and `tracks[]` are added (SPEC §2 "with optional `periods`, `tracks`"). No new kinds (`sequence`, `narrative`, `story`, `flowchart`-style connector graphs) — D9; a causality/flowchart layout belongs to Diagram.
- Infer causality from order alone (SPEC §4 non-goal). The engine renders order, duration, and grouping; it never asserts cause/effect.
- Build Visual/GeoMap/Chart/Diagram behavior, or a poster-timeline widget. D9 — no engine smuggling.
- Import any peer engine package or `@open-edu/*` (D2/§6). `timeline-engine` depends only on `@knowledgeassemble/interactive-engine` + `zod`.
- Add wall-clock playback. `play-pause`/`step`/`scrub` are **deterministic reducer operations** over a stable chronological index — no timers, no `setInterval`, no `Date.now`. Renderer-side auto-advance (if ever) is a host/renderer concern, OUT of P5 (P4).
- Use `Date`, `Date.parse`, `Intl`, or `toISOString` for date arithmetic (calendar/environment-dependent → non-deterministic). Dates parse via a hand-written pure function over a closed grammar (Timeline-D3).
- Use `Math.random` or any non-determinism in scene/layout/SVG (P4). Determinism is tested, including a two-run byte-identical fixture.
- Add arbitrary JS, event handlers, `javascript:` URIs, or document/`on*` attributes to any spec or emitted SVG (P2/P10).
- Invent dates, durations, or groupings. Everything renderable comes from `content.events[]`/`periods[]`/`tracks[]`; provenance via envelope `sources[]` (DESIGN §9).
- Author pixels. `content` carries temporal semantics (id/label/date/from/to/membership) only — no `x`/`y`/`width`/lanes/rows at the spec surface; track lanes and axis positions are derived layout.

**Non-negotiables (carried from P1–P4, extended for Timeline).**
- `additionalProperties:false` on the timeline schema AND every nested object — `content`, `events[]`, `periods[]`, `tracks[]`, `style`. Unknown keys are a validation error, never ignored (P11).
- Shared §67 error codes only: `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Never bespoke.
- D5 semantic actions only (`select`, `deselect`, `focus`, `play-pause`, `step`, `scrub`, `reset`, …). No `click`/`pointer.*` in specs. Renderer input maps outside the spec.
- Event-only mutation through the shared reducer/`EventLog`; namespaced result events `timeline.<…>`; the log stays serializable and replayable (P4). **The playing state lives in core `EngineState.playback`** — Timeline does not invent a private playback store.
- Semantic-first: specs describe meaning (dates, labels, membership), never coordinates.
- SVG is a compiled artifact; the canonical source is the semantic scene (visual ARCHITECTURE §2).
- **Linear accessible alternative is a first-class L4 output** derived from the same semantic model (SPEC §3.3) — nothing is conveyed by shape/color or chronology position alone.

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P4 must be landed and its gate green

P5 is written ahead of P4; it MUST NOT execute until P4 is DONE and its §4 gate is green (PLAN.md §2 "phases are promoted one at a time"). Before any P5 work:

1. `main` posts the P4 merge (`@knowledgeassemble/geomap-engine` landed); full gate green on `main`:
   `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.
2. `docs/PLAN.md` §10 shows P4 `DONE` and §11 has the P4 lines + GeoMap-D1…GeoMap-D4 (verified — do not re-do).
3. Confirm P5 **timeline** docs state: `docs/engines/timeline/SPEC.md` is **thin (69 lines)** and already says "Proposed (thin — gates P5 implementation; expand in code, not prose)" — the P5 **schema** is authored from it at T1 and the SPEC itself is only bumped from "Proposed (thin)" to "Normative at P5" as a reviewer-approved T8 edit. `docs/engines/timeline/VISION.md` (Draft, 1019 lines) stays **Frozen** — context only. `docs/schemas/timeline-spec.schema.json` does **not** exist yet — it is authored at T1.
4. Confirm the P2.5 timeline **stub** and its contract are intact on `main`: `packages/timeline-engine/src/{schema,engine,reducer}.ts`, `TIMELINE_EVENT_SELECTED`, and the canonical composition fixture + golden event log (`packages/interactive-engine/test/fixtures/composition/narrative-timeline-visual.golden.json`) — P5 upgrades the stub and MUST NOT change the `timeline.event-selected` payload shape or the golden log.

If anything above is red, stop and fix it first.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p5-timeline-engine
```

Commit per task with repo style (`P5 T<nn>: <one-liner>`). Open a PR against `main`; land with `gh pr merge <n> --merge --delete-branch`. `main` is PR-protected — no direct pushes.

### 1.3 Grounded current state (verify on disk before writing code)

| Asset | Location | Status |
|---|---|---|
| Timeline normative spec | `docs/engines/timeline/SPEC.md` | Thin (69 lines). MVP `events`; `periods`/`tracks` "in P5"; `play-pause`/`step` D5; `timeline.event-selected` on `select`; §3 P5 slice list; §4 causality non-goal |
| Timeline vision | `docs/engines/timeline/VISION.md` | Draft 0.1 — **Frozen**; context only at P5 |
| Timeline JSON schema | `docs/schemas/timeline-spec.schema.json` | **Missing — authored at T1** (mirror `visual-spec.schema.json` conventions) |
| P2.5 timeline stub | `packages/timeline-engine/` | `schema.ts` (`kind: literal('events')`, `TimelineEventSchema` strict: id/label/date/links?), `engine.ts` (`TimelineEngine`, L1 + thin L2, hardwired smoke emit), `reducer.ts` (`timelineReducer`: select validates id, **`scrub` → `UNSUPPORTED_ACTION`**), `index.ts`, `test/timeline.test.ts` |
| P2.5 frozen contract | `docs/fixtures/composition/narrative-timeline-visual.json` + `packages/interactive-engine/test/fixtures/composition/narrative-timeline-visual.golden.json` | `timeline.event-selected` full-record payload with `links.visualEntityId`; golden event log must stay green |
| Core public surface | `packages/interactive-engine/src/index.ts` | `Engine`/`EngineRegistry`, `runPipeline`/`ValidationResult`, `validateEnvelope`, `EventLog`, `baseReducer`/`initialState` (state already has `playback: 'playing'\|'paused'\|'stopped'`), `EngineError`/`ERROR_CODES`, `ACTION_TYPES` (includes `scrub`), `A11yNode`/`a11yTreeOf`, `EngineHost` |
| Pipeline template | `packages/visual-engine/`, `packages/chart-engine/` | `schema.ts`/`schemas/*.json`/`scene`/`layout`/`render`/`validation`/`engine.ts` + `fixture/…` + `e2e/*.spec.ts` — mirror this shape |
| Conformance app | `apps/conformance/src/main.ts` + `chart.ts`/`geomap.ts` (post-P3/P4) + `composition.ts` | add `?engine=timeline`; `window.__timelineHarness` |
| Engine e2e home | `packages/*/e2e/*.spec.ts` | engine-package convention — timeline e2e lives in `packages/timeline-engine/e2e/` |
| Agent skill convention | `docs/engines/<engine>/skills/<name>/SKILL.md` | timeline home mirrors |

### 1.4 Decision gates to close at T0 (record in `docs/PLAN.md` §11 change log before implementing)

- **Timeline-D1 — Closed temporal model.** `content.kind` stays `"events"` (P2.5-frozen literal) and stays closed — no new kinds. P5 adds **optional** `periods[]` (`{ id, label, from, to, description?, style?: {role} }`) and `tracks[]` (`{ id, label, events: string[] }`) per SPEC §2. Period bands and track lanes are **derived** layout; events remain the **only selectable entity type** (selectable targets = `content.events[].id`, unchanged from P2.5 dispatch semantics). If a reviewer pushes back, the fallback is a plan note, never a silent widening.
- **Timeline-D2 — Namespaced result events.** Preserve `timeline.event-selected` (frozen, carries the full event record + `links` — Gap-B contract). Add `timeline.event-focused` on D5 `focus`, same payload shape. Playback (`play-pause`/`step`/`scrub`) surfaces through core `state-changed` + `EngineState.playback` ONLY — no `timeline.playback-*` event invention. Selection/focus of non-event entities is OUT (they are not selectable).
- **Timeline-D3 — Deterministic temporal semantics.** Dates follow a **closed grammar**: `^[+-]?\d{1,6}(-\d{2}){0,2}$` (signed year `YYYY`/`YYYY-MM`/`YYYY-MM-DD`, astronomical year numbering — year `0` = 1 BCE, so `-500` sorts correctly). Parse to a proleptic-Gregorian day number via **hand-written pure integer math** — `Date`/`Date.parse`/`Intl`/`toISOString` are banned. Ties order stably by content order. Scales/ticks/period bands derive from parsed day numbers; the year-tick ladder is a fixed deterministic set (`1, 2, 5, 10, 25, 50, 100, 250, 500, 1000` — pick the coarsest step giving 4–8 labels).
- **Timeline-D4 — Deterministic playback via core state, not derived fields.** Playback uses the core `EngineState` fields directly — there is **no** flat derived `playback.position` (core state already carries `playback: 'playing'|'paused'|'stopped'` and `step: number`). The reducers extend `baseReducer`: `play-pause` toggles `state.playback`; `step` advances a monotonically increasing `step` index over the **stable chronological event sequence** (derived once at instantiate); `scrub` sets `step` to the target event id's index (`findIndex` over the same sequence); `reset` restores the initial index. All reducer-pure and event-logged — no timers, no wall clock. This is what PLAN exit criterion 2 ("playback actions route through the standard action set") proves.

---

## 2. The Timeline specification contract (author this first)

Author `docs/schemas/timeline-spec.schema.json` (canonical) + Zod mirror in `packages/timeline-engine/src/schema.ts` (upgrading the P2.5 stub's schema), from the thin SPEC §2 restated in the shared envelope (D1 — no `{ "timeline": {} }` wrapper, no `schemaVersion`). Target content shape:

```jsonc
{
  "type": "timeline",                       // envelope; L1 via interactive-engine.schema.json
  "version": "1.0.0",
  "id": "timeline-independence",
  "metadata": { "title": "Indian independence — key events" },
  "purpose": { "learningObjective": "Compare the pace of revolt and constitutional reform", "reasoningMode": "sequence" },
  "content": {
    "kind": "events",                       // closed literal — unchanged from P2.5 (Timeline-D1)
    "events": [                             // unchanged contract (id/label/date/links?)
      { "id": "event-1857", "label": "1857 uprising", "date": "1857" },
      { "id": "event-1919", "label": "Jallianwala Bagh", "date": "1919-04-13" },
      { "id": "event-1947", "label": "Independence", "date": "1947-08-15",
        "links": { "visualEntityId": "figure-independence" } }    // composition hint (D8), not an import
    ],
    "periods": [                             // optional (Timeline-D1)
      { "id": "period-company", "label": "Company rule", "from": "1757", "to": "1858",
        "description": "East India Company administration", "style": { "role": "secondary-period" } }
    ],
    "tracks": [                              // optional (Timeline-D1)
      { "id": "track-movement", "label": "National movement", "events": ["event-1857", "event-1947"] },
      { "id": "track-reform", "label": "Constitutional reform", "events": ["event-1919"] }
    ]
  },
  "interaction": { "mode": "explore",
    "actions": ["select", "deselect", "focus", "play-pause", "step", "scrub", "reset"] },
  "questions": [],
  "sources": [{ "class": "authoritative" }],   // provenance (DESIGN §9)
  "accessibility": { "label": "Timeline of Indian independence movements and constitutional reform." }
}
```

Rules to encode in the schema + Zod (`additionalProperties:false` at every level):

1. `content.kind` — literal `"events"` (Timeline-D1), required; events not in the set of `["events"]`. Unknown kind → `INVALID_ENTITY` at L2.
2. `events[]` — `{ id (id-pattern, unique), label (non-empty), date (Timeline-D3 grammar), links?: Record<string,string>, trackId? (see rule 5) }`. **Unchanged shape** from P2.5 for `id`/`label`/`date`/`links` (the schema may add optional `trackId`, but the fixture composition spec stays valid as-is).
3. `periods[]` (optional) — `{ id (id-pattern, unique), label, from (grammar), to (grammar), description?, style?: { role?: "primary-period"|"secondary-period"|"highlight"|"selected" } }`. `from ≤ to` checked at L2 temporal (`INVALID_ENTITY`).
4. `tracks[]` (optional) — `{ id (id-pattern, unique), label, events: string[] }`; every referenced event id exists (`INVALID_REFERENCE`); an event belongs to at most ONE track (`INVALID_ENTITY` if repeated); events not listed on any track render on a derived default lane. Track order = declaration order (rendering order).
5. Membership is derived, never positions: a track's lane, an event's x-position, a period band's width all come from layout — no `x`/`y`/`row`/`pixel` in `content`.
6. Provenance (DESIGN §9): dates/labels/groupings come from the spec; envelope `sources[].class` ∈ `{authoritative,illustrative,simulated}`; nothing is interpolated, extrapolated, or defaulted. **Grandfather:** the frozen P2.5 composition fixture (`docs/fixtures/composition/narrative-timeline-visual.json`) carries neither `accessibility` nor `sources` — it is exempt from the L4 `accessibility.label` requirement and the `sources[]`-required rule for the lifetime of the composition phase; the timeline engine's own fixtures (`fixture/**/input.timeline.json`) MUST carry both.
7. Playback is state, not content: `content` carries no position/current index/timers — only the reducer holds `playback` (core state), so the log stays replayable.
8. Semantic-first: no `x`/`y`/`width`/`color` values at the spec surface; style accents reference host tokens via `style.role` only (L4 rejects color-only meaning).

Because P1 core already runs L1 on the envelope, `TimelineEngine.validate` reuses `runPipeline` and supplies its own **L2 semantic** (with the temporal tier folded in — no separate named hook), **L3 layout**, **L4 accessibility** hooks (mirroring `chart-engine`/`geomap-engine`).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prereqs, decision-gating, timeline docs freeze
- Reconcile §1.1 (P4 landed; gate green). Branch per §1.2.
- Record Timeline-D1…Timeline-D4 (§1.4) in `docs/PLAN.md` §11 change log before implementation.
- Confirm SPEC stays the thin normative reference (status bump "Normative at P5" ONLY as a reviewer-approved T8 follow-up; otherwise leave as-is). Do NOT expand `VISION.md` prose; do NOT port vision notions (`zoom`, causality, storylines, animations) into the schema.
- Note in the change log: the P2.5 stub test "`scrub` is `UNSUPPORTED_ACTION` at P2.5" is **intentionally flipped** at T6 to "`scrub` steps the timepoint" — a deliberate, documented contract change (P2.5 SPEC said scrub is "for P5").

**Done when:** PLAN.md §11 has the four Timeline-D decision lines (Timeline-D1…Timeline-D4, plus the scrub-flip note); branch `feat/p5-timeline-engine` exists; `pnpm -w test` is green on the branch base INCLUDING the P2.5 golden composition test.

### T1 — Timeline-engine schema upgrade + scaffold + parity guardrail
- Extend the existing package (do NOT recreate): folders `src/scene`, `src/layout`, `src/render`, `src/validation`, `src/schemas/timeline-spec.schema.json`, `test/schema-parity.test.ts`, `e2e/timeline.spec.ts`, `fixture/{events,periods,tracks,independence}/`:

```text
packages/timeline-engine/
  package.json                 # name: @knowledgeassemble/timeline-engine; deps: interactive-engine + zod only
  tsconfig.json / vitest.config.ts / playwright.config.ts   # testDir ./e2e; webServer: pnpm --filter @knowledgeassemble/conformance dev (port 5173)
  src/
    index.ts                   # public exports (types + functions only)
    schema.ts                  # upgraded: TimelineEventSchema + TimelinePeriodSchema + TimelineTrackSchema + TimelineContentSchema + consts
    schemas/timeline-spec.schema.json   # canonical (authored here; also copy to docs/schemas/)
    scene/types.ts, scene/build.ts
    layout/time.ts, layout/lanes.ts, layout/engine.ts
    render/types.ts, render/svg.ts
    validation/semantic.ts, validation/temporal.ts, validation/layout.ts, validation/accessibility.ts
    reducer.ts                 # upgraded timelineReducer (play-pause/step/scrub; select/focus gate) — keeps extends-baseReducer discipline
    engine.ts                  # upgraded TimelineEngine (full pipeline instantiate) — preserves the P2.5 emit contract
  test/
    schema-parity.test.ts      # §5 guardrail
    schema.test.ts, scene.test.ts, time.test.ts, lanes.test.ts, layout.test.ts, render-svg.test.ts,
    validation.test.ts, instance.test.ts
  e2e/timeline.spec.ts         # Playwright (T7)
  fixture/{events,periods,tracks,independence}/   # golden fixtures (T7)
```

- Upgrade `schema.ts` to the §2 model (add `TimelinePeriodSchema`, `TimelineTrackSchema`; keep `TimelineEventSchema` shape, add optional `trackId`); `z` strict everywhere. Keep `TIMELINE_EVENT_SELECTED` export; add `TIMELINE_EVENT_FOCUSED`.
- Author `schemas/timeline-spec.schema.json` (canonical) + copy to `docs/schemas/`.
- **Parity guardrail** (`test/schema-parity.test.ts`): `content.kind.enum` (sorted) === `["events"]`; `events[]`/`periods[]`/`tracks[]`/`content` all `additionalProperties === false`; `periods[].from/to` match the Timeline-D3 date regex const exported from schema.ts; provenance `class` enum === `{authoritative,illustrative,simulated}`; no `makeItPretty|svgMagic|x|y|width|height|pixel` in the content surface.

**Done when:** `pnpm --filter @knowledgeassemble/timeline-engine typecheck` green with `.js` specifiers; parity/golden tests green (`content.kind:"tracks"` still fails `INVALID_ENTITY`, flat versus kind-model); the §2 example parses; the existing P2.5 composition golden test still passes against the upgraded schema.

### T2 — Scene model + events/periods/tracks scene builder
Files: `scene/types.ts`, `scene/build.ts`.

- `scene/types.ts` — Timeline `SemanticRole`: `'timeline' | 'axis' | 'gridline' | 'tick' | 'label' | 'period-band' | 'event-marker' | 'track-lane' | 'legend' | 'group' | 'selectable'`. `SceneNode`/`Scene` reuse the chart/visual conventions (`bounds?` set by layout, `acceptsActions?: ActionType[]`, `interactive?`, `children[]`).
- `scene/build.ts` — `buildScene(content): Scene`:
  - Deterministic, pure: **no projection/layout/bounds** — just the semantic walk.
  - Emit one `event-marker` node per event with `id = <event.id>` (**node id === selection target id**, P2.5-frozen dispatch semantics), `role:'selectable'`, `interactive:true`, `acceptsActions:['select','focus']`, metadata `{ date (parsed day number), dateString, label, trackId?, links? }`.
  - Emit one `period-band` node per period: `id: period-<id>`, metadata `{ fromDay, toDay, label, description?, role }`; not selectable.
  - Emit one `track-lane` node per track + a derived `track-default` lane for events whose `trackId` is absent; `id: track-<id>`, metadata `{ label, eventIds[] }`. Duplicate event membership → `INVALID_ENTITY`; unknown `trackId`/track event ref → `INVALID_REFERENCE` (surfaced here or at T5 — at minimum the builder never throws on well-formed data).
  - Axis/gridline/tick/label scaffold ids: `axis-time`, `<measure>-tick-<n>`, `timeline-gridline-<n>`, `timeline-label-<event.id>` (T3 fills).
  - Deterministic ids; assert uniqueness (`INVALID_ENTITY` on duplicates).
- Keep the P2.5 emission contract in mind: scene order is content order; the reducer's sorted playback sequence is computed separately in T6.

**Done when (test-first):** a period-bearing spec yields period-band + event-marker + track-lane nodes with correct resolved metadata; events without `trackId` land on `track-default`; duplicate track membership → `INVALID_ENTITY`; unknown track/event ref → `INVALID_REFERENCE`; markers carry parsed day numbers sorted stably.

### T3 — Deterministic time scale + lane layout engine
Files: `layout/time.ts`, `layout/lanes.ts`, `layout/engine.ts`.

- `time.ts` — pure functions (no `Date`):
  - `parseDate(dateString)` → day number via proleptic-Gregorian integer math (Timeline-D3); closed grammar; malformed → thrown/gated upstream (L2 temporal rejects first).
  - `timeScale(domain: [d1,d2], range: [x1,x2])` linear map + `invert`; `niceYearTicks(d1,d2)` → fixed ladder `1,2,5,10,25,50,100,250,500,1000` picks the coarsest step yielding 4–8 labels; `{ ticks: number[], domain: [number,number] }` **byte-deterministic**.
  - Period `from`/`to` → band start/end; single date → day.
- `lanes.ts` — `Rect`/`Point`, `union`, `translate` (chart-local copy, no cross-engine import); lane stack: track order + default lane, each lane a (derived) row height from `Human` tokens' `minTouchTarget`/`textStyle`.
- `layout/engine.ts` — `layout(scene, ctx): Scene` where `ctx` comes from `EngineHost.tokens` (`{ width, height, minTouchTarget, textStyle }`). Assigns bounds: time axis + ticks at bottom; period bands full-bleed behind lanes; event markers at `(x(date), lane.centerY)` sized ≥ `minTouchTarget`; labels derived above/beside markers (collision = deterministic offset rule); lane labels left column. Pure: identical input → identical bounds.

**Done when (test-first):** `parseDate('1947-08-15')` and `parseDate('1857-01-01')` order correctly and `parseDate('-500')` sorts before `parseDate('1')`; `niceYearTicks` on the independence fixture matches a literal-asserted tick array; two identical `layout` calls byte-equal bounds; markers on different tracks land on distinct lanes; period band spans its `[fromDay,toDay]`.

### T4 — SVG renderer + a11y tree + linear alternative + interaction map
Files: `render/types.ts`, `render/svg.ts`.

- `svgFrom(scene, ctx): { svg: string; a11y: A11yNode[]; interactive: Array<{ id: string; action: ActionType }>; linear: TimeRow[] }`.
  - Semantic SVG: `<svg>` with `<title>`/`<desc>` from envelope `accessibility`; `<g id="timeline-root">`, `<g id="timeline-tracks">`, `<g id="timeline-axis">`, one `<g>` per track lane; period bands → `<rect>` with `data-oedu-period`, event markers → `<circle>`/pin glyph (`data-oedu-event`), track labels → `<text>`, axis ticks/gridlines → derived `<line>`s; `id`/`data-oedu-*` attributes; deterministic attribute + node order (scene walk order).
  - **Security:** whitelisted attributes only; no `<script>`, `on*`, `javascript:`. **Determinism:** two runs byte-identical.
  - `a11y`: reuse core `A11yNode`; one node per event marker with `role` + non-empty `label` (`<event.label> (<date>)`, via host locale) and one per period band (`<period.label>: <from> – <to>`); keyboard order `timeline → tracks → events → axis` (SPEC-aligned; nothing by color alone).
  - `linear`: `TimeRow[]` from the **same** scene/data — `{ kind:'period'|'event', id, label, from?: day/date, to?: day/date, date?: day/date, trackId?, trackLabel?, description? }` sorted chronologically (period by `from`, event by `date`; stable) — the SPEC §3.3 linear accessible alternative. The conformance app renders it as an accessible ordered list/`<table>`.
  - `interactive`: event markers → `select`/`focus`. Exposed for the host, never embedded.

**Done when:** golden `expected.svg` for the events fixture is generated and stable across two runs (determinism test); no `onclick`/`<script>`; `a11y` has labeled nodes for every event marker AND every period band; `linear` lists all periods + events exactly, chronologically sorted; `interactive` maps each event to `select`/`focus`.

### T5 — Timeline validator (L2 semantic incl. temporal tier / L3 / L4 hooks)
Files: `validation/semantic.ts` (calls the temporal tier internally), `validation/temporal.ts`, `validation/layout.ts`, `validation/accessibility.ts` → plugged into core `runPipeline`.

- **L2 semantic** — `content.kind` ∈ `["events"]` (`INVALID_ENTITY`); event/period/track ids valid + unique (`INVALID_ENTITY`); period/track labels non-empty; track event refs resolve and membership ≤1 per event (`INVALID_REFERENCE`/`INVALID_ENTITY`); `style.role` ∈ closed set; `acceptsActions` ⊆ D5 (`INVALID_ACTION`); provenance `sources[].class` valid (`INVALID_SPEC`).
- **L2 semantic — temporal tier (internal to the semantic hook, not a separate named hook):** every `date`/`from`/`to` matches the Timeline-D3 grammar (`INVALID_ENTITY`); `periods[].from ≤ to` after parse (`INVALID_ENTITY`); display-range sanity (domain span > 0; degenerate/empty punctuation caught) (`INVALID_ENTITY`). Chronology is derived, never validated against invented facts.
- **L3 layout** — after `layout(scene)`: all markers/bands inside canvas; interactive targets ≥ `minTouchTarget`; marker-label collision count bounded (deterministic offset) (`INVALID_STATE`/`ACCESSIBILITY_ERROR` on hard failure, warning otherwise).
- **L4 accessibility** — envelope `accessibility.label` present (the grandfather note in rule 6 applies: the frozen composition fixture is exempt); every interactive marker labeled; no color-only meaning (a styled event without label/role distinction flagged); `linear` non-empty and covers every period + event.
- Hooks return `ValidationResult` and plug into `runPipeline(spec, { semantic, layout, accessibility })` — `ValidationHooks` has exactly those three slots; the temporal tier runs inside the `semantic` hook.

**Done when (test-first):** §2 fixture → `valid:true, issues:[]`; `date:"yesterday"` / `from>to` fail `INVALID_ENTITY`; a track referencing an unknown event fails `INVALID_REFERENCE`; an event in two tracks fails `INVALID_ENTITY`; a marker without label fails L4 `ACCESSIBILITY_ERROR`; an out-of-canvas layout fails L3 `INVALID_STATE`.

### T6 — TimelineEngine facade (upgraded stub) + registry + namespaced events + playback reducer
Files: `reducer.ts`, `engine.ts` (+ `test/instance.test.ts` registering in the core `EngineRegistry`).

- Upgrade `timelineReducer(state, action, seq)` to a pure playback reducer using the **stable chronological event sequence** `seq` (computed once at instantiate from `content.events` via Timeline-D3 parse + stable sort), extending `baseReducer`. Playback state lives in the core fields `EngineState.playback` and `EngineState.step` (Timeline-D4) — there is no flat derived `position`:
  - `select`/`focus` on an event id → validate (`INVALID_ENTITY` if unknown) → pass through `baseReducer` and set the corresponding selection/focus + `state.step` to that event's index (a select is also a jump-to for clarity) — emission handled in `engine.ts`.
  - `play-pause` → toggle `EngineState.playback` `'playing'`/`'paused'` (deterministic; no timers).
  - `step` → advance `EngineState.step` by 1, clamped to `[0, seq.length-1]` → `state-changed`.
  - `scrub` → set `EngineState.step` to `seq.findIndex(id)` (must exist → `INVALID_ENTITY` otherwise) — replaces the P2.5 `UNSUPPORTED_ACTION` (T0 flip).
  - `reset` → step 0, selection/focus cleared, playback `'stopped'` → `baseReducer`.
- Upgrade `TimelineEngine implements Engine` (`type:'timeline'`):
  - `validate(spec)` = `runPipeline` with the T5 hooks (L1 envelope + L2/L3/L4).
  - `instantiate(spec, host, id?)` — validate (throw `INVALID_SPEC` on failure), `buildScene` → `layout` → `render`, **then emit the exact P2.5 sequence** (`engine-mounted`, `engine-ready`) and wrap an `EngineInstance` whose `dispatch` appends `interaction-started`, `state-changed`, the namespaced event when applicable, `interaction-completed` — byte-compatible with the golden log order.
  - Emit `timeline.event-selected` on `select` and `timeline.event-focused` on `focus`, both with `data` = **full event record** (+ `links`) — Timeline-D2 / Gap-B preserved. Other actions emit ONLY the standard core events.
  - `snapshot()` returns `EngineState` (incl. `playback` + `step` as the chronological index, `events`) + read-only `scene`, `svgResult`, `linear`. Wire `Host.tokens → LayoutContext`, `Host.locale` → text resolution.
- Import **only** the core public surface (`index.ts`); `.js` specifiers.

**Done when (test-first):** the P2.5 golden composition test still passes byte-for-byte (registry + emit order + payload); `step` advances `snapshot().step`; `play-pause` toggles `playback`; `scrub({target:{id:'event-1857'}})` jumps `step` to that event's index; unknown scrub target → `INVALID_ENTITY`; `focus` emits `timeline.event-focused` with full record + `links`; `select`/`focus`/`play-pause`/`step`/`scrub` each emit `timeline.event-selected`/`focused` exactly ZERO extra times; event ids `<instanceId>:<seq>`.

### T7 — Golden fixtures + conformance tab + browser e2e
- Golden fixtures (`fixture/events/`, `fixture/periods/`, `fixture/tracks/` minimal per-feature slices + `fixture/independence/` integrated slice used by conformance): `input.timeline.json`, `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.linear.json`, `validation.json`, fixture `README.md`. Asserted by snapshot tests (deterministic; re-running tests does not mutate them).
- Conformance `?engine=timeline`: `apps/conformance/src/timeline.ts` mirroring the chart/geomap route — register `TimelineEngine`, load the independence fixture, inject `svgFrom(...)` SVG into the DOM, render `linear` as an accessible `<ol>`/`<table>` with `aria-label` (temporal semantics, not raw SVG), expose `window.__timelineHarness = { dispatch, snapshot, events, svg, linear, tryCreate }`; route wiring in `apps/conformance/src/main.ts`. The conformance app wires playback **controls** to `play-pause`/`step`/`scrub` D5 dispatches and renders the highlighted current event from `snapshot().step`.
- `e2e/timeline.spec.ts` (Playwright):
  1. **a11y** — SVG has `<title>`/`desc`; every event marker AND every period band has a non-empty `aria-label`; the `linear` list exists and lists all periods + events chronologically (nothing color-only).
  2. **interaction** — keyboard/pointer activation of an event dispatches `select`; snapshot selection contains the event id; `timeline.event-selected` recorded with the full event + `links`.
  3. **playback** — `play-pause` toggles `snapshot().playback`; `step` moves the highlighted event forward; `scrub` jumps to a target event; all through the shared `window.__timelineHarness.dispatch` (standard actions only).
  4. **replay** — events replay in `seq` order via core `EventLog` (monotonic; determinism).
  5. **data fidelity** — `tryCreate` of a spec with `date:"yesterday"` or `period.from > to` fails with a shared code; an event in two tracks fails; a track referencing an unknown event fails.
  6. **rejection** — `content.kind:"tracks"` and an unknown `content` key fail `tryCreate`.

**Done when:** all six specs green in a real browser against installed `timeline-engine` + `interactive-engine`, and the P2.5 composition e2e remains green.

### T8 — Agent skill + doc reconciliation + full exit gate
- Agent skill `docs/engines/timeline/skills/temporal-timeline/SKILL.md` (mirror the chart/geomap skill homes) — when to use Timeline vs Chart (time vs magnitude) vs Visual; never invent dates/durations; `kind:"events"` + optional `periods`/`tracks`; Timeline-D3 date grammar; membership not positions; playback via `play-pause`/`step`/`scrub`; `links.*` as composition hints; linear alternative; no causality from order; validate.
- Bounded proof: the skill's canonical example JSON is checked in (e.g. `docs/fixtures/timeline/skill-example.json`) and round-trips `TimelineEngine.validate` valid in a unit test.
- `docs/fixtures/timeline/README.md`: validation commands (`timeline-spec.schema.json` L1 + embedded `interactive-engine.schema.json` L1 env + L2–L4 via `TimelineEngine.validate`) and the "no invented dates/values" rule.
- `docs/PLAN.md` §10 status board `P5 → DONE` **only after** the §4 gate is green; add §11 change-log lines (P5 DONE + the four Timeline-D decisions + the scrub-flip note). Flip `timeline/SPEC.md` status per T0 decision.

**Done when:** full exit gate green (§4); PLAN.md status board + change log consistent.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P5 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Events/periods/tracks slice green with replayable event log | T4 golden `expected.{svg,scene,a11y,linear}.json` + T5 validation + T7 `e2e/timeline.spec.ts` (a11y, interaction, playback, replay) — and the P2.5 composition golden log + e2e stay green |
| 2 | Playback actions route through the standard action set | T6 reducer (`play-pause`/`step`/`scrub` via `baseReducer`-extending dispatch) + T7 e2e spec 3; conformance controls dispatch D5 actions only |

**Self-checks (all MUST pass, not just the two PLAN criteria):**
- **No engine smuggling (D9):** `grep -rn "from '@knowledgeassemble/\|@open-edu/" packages/timeline-engine/src` yields only `interactive-engine`; no `visual-engine|chart-engine|geomap-engine|diagram-engine` imports; no visual/chart kind or causality vocabulary (`implies|because|cause-effect|flowchart`) in src except negative-test/description strings.
- **Closed temporal model:** `grep -rn "kind" packages/timeline-engine/src/schemas/timeline-spec.schema.json` → enum is only `["events"]`; `periods`/`tracks` optional; no `narrative|story|sequence` kinds.
- **Deps:** `packages/timeline-engine/package.json` deps = `interactive-engine` + `zod`.
- **Determinism:** two-run byte identical `expected.svg` test green; `grep -rn "Date.now\|Math.random\|performance.now\|new Date\|Date.parse\|toISOString\|Intl\." packages/timeline-engine/src` → empty.
- **Shared error codes only:** thrown codes ⊆ §67 set (`grep -rn "'[A-Z_]*ERROR'\|'INVALID_'" packages/timeline-engine/src`).
- **Semantic-first + ground truth:** no `x`/`y`/`pixel`/`width` authored in specs; `grep` of every fixture `input.timeline.json` surfaces no geometry keys; every date/grouping traces to `content`.
- **Playback is core state:** `EngineState.playback` drives rendering; `grep -rn "setInterval\|setTimeout" packages/timeline-engine/src` → empty.
- **D6:** no store/i18n/studio/scoring modules; `questions` stay empty arrays in fixtures.

---

## 5. Schema ↔ Zod parity guardrail (T1 must include)

`test/schema-parity.test.ts` (timeline) asserts the canonical JSON Schema and the runtime Zod mirror stay in sync, per T1 §3 list — plus:
- `content.kind.enum` (sorted) === the TS kind const === `["events"]`; `periods[]`/`tracks[]`/`events[]`/`content` `additionalProperties === false`.
- the `date`/`from`/`to` grammar regex in the schema's `pattern` === the `DATE_GRAMMAR` const in `schema.ts`.
- the emitted SVG/a11y/linear reciprocity: every event marker AND every period band appears in the a11y tree AND in `linear` (parity between `render` map, `a11y`, and the linear derivation).
- every fixture `input.timeline.json` (all four feature sets) round-trips `TimelineEngine.validate` valid, and its `expected.*` files are byte-stable.

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not put React/DOM in `packages/timeline-engine`.** SVG is pure data; the `linear` list/`<table>` is built in the conformance app, not the engine.
2. **Do not import peer engines or OpenEdu** (D2/§6). Only `@knowledgeassemble/interactive-engine` public surface + `zod`.
3. **Do not build Visual/GeoMap/Chart/Diagram behavior, new `content.kind`s, or causality inference** (D9 + Timeline-D1 + SPEC §4). `kind:"events"` + optional `periods`/`tracks` only — anything else is a contract violation; reject in review.
4. **Do not reach for `Date`/`Intl`/`Date.parse`/`toISOString`** — non-deterministic across environments. Dates parse via `layout/time.ts` pure integer math (Timeline-D3). Determinism is tested with byte-identical fixtures; a golden change requires fixture review.
5. **No wall-clock playback.** `play-pause`/`step`/`scrub` are reducer-pure over the stable chronological sequence (Timeline-D4); no timers, no auto-advance in engine code.
6. **Do not invent dates, durations, or groupings.** All rendered temporality comes from `content.events[]`/`periods[]`/`tracks[]`. Provenance `sources[]` required. No interpolation/extrapolation.
7. **Do not author geometry.** No `x`/`y`/`width`/`row`/`pixel` in specs; lanes/positions/ticks are derived (Timeline-D3/Timeline-D4). No LLM-pleaser props.
8. **Do not emit unsafe SVG.** Whitelist attributes; never `on*`, `<script>`, `javascript:`.
9. **Use exactly the §67 codes** — bad kind/date/range/membership → `INVALID_ENTITY`; unknown ref → `INVALID_REFERENCE`; bad spec shape → `INVALID_SPEC`; bad action → `INVALID_ACTION`; layout infeasibility → `INVALID_STATE`; a11y gap → `ACCESSIBILITY_ERROR`. `scrub` is SUPPORTED at P5 (flip the P2.5 test) — do not reintroduce `UNSUPPORTED_ACTION` for it.
10. **Namespaced events only.** `select` → `timeline.event-selected`; `focus` → `timeline.event-focused`; payload = full event record (+ `links`). No per-entity or playback event-name invention — playback changes surface through `state-changed`.
11. **Backward compat is load-bearing.** Do NOT change `content.kind`, the `events[]` shape, or the `timeline.event-selected` payload — the P2.5 composition fixture + golden log depend on them. New fields are additive (`trackId`, period/track arrays).
12. **`.js` import specifiers + `src/index.ts` as the only public surface** of `timeline-engine`; deep imports into `interactive-engine` internals are forbidden (NodeNext).
13. **Reuse, don't reimplement the event system.** `timelineReducer` extends `baseReducer`; playback state lives in core `EngineState.playback` — never a private store.

---

## 7. Definition of Done (P5-specific)

P5 is complete when:

- `docs/PLAN.md` §4 P5 exit criteria 1–2 are green, verified by the §4 gate commands (not assertion).
- `packages/timeline-engine` (full renderer, upgraded from the P2.5 stub) passes `typecheck`, `lint`, unit tests, and browser e2e — AND the P2.5 composition golden/e2e remains green.
- `timeline-spec.schema.json` (1.0.0) is canonical and mirrored in Zod with the §5 parity guardrail green.
- The events/periods/tracks slice has byte-stable golden fixtures (`input.timeline.json`, `expected.{svg,scene,a11y,linear}.json`, `validation.json`) checked in.
- Playback (`play-pause`/`step`/`scrub`) routes through the standard D5 action set with `EngineState.playback` driving the highlight; replayable.
- Conformance `?engine=timeline` works (SVG + accessible `linear` list/table); the temporal-timeline skill example round-trips validation.
- `docs/PLAN.md` marks P5 **DONE**, logs the change (including Timeline-D1…Timeline-D4 and the scrub flip), and the timeline SPEC/VISION statuses match the T0 decision.

Do **not** start P6 until the §4 gate is green.