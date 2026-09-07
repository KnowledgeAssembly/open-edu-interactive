# Phase 2.5 — Composition Smoke Test (D8): Detailed Implementation Plan

**File:** `docs/PLAN-P2.5.md`
**Status:** Detailed task breakdown for the P2.5 phase (supersedes nothing; expands `docs/PLAN.md` §4 P2.5)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P2.5
**Do this first:** read, in order — `docs/DESIGN.md` (§5, §6, §7.4, §9, §13, §16 D8, §18), `docs/INTERACTIVE-ENGINE-SPEC.md` (§21–§25, §67, §90), `docs/engines/timeline/SPEC.md` (whole — thin), `docs/engines/visual/SPEC.md` (§9 `content.kind` vocabulary, §82 namespaced result events), `docs/schemas/composition.schema.json`, `docs/fixtures/composition/narrative-timeline-visual.json`, `docs/fixtures/composition/README.md`, `docs/PLAN.md` (§4 P2.5, §10 status board), `docs/PLAN-P2.md` (for conventions + the P2 API you build on). These are normative; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Prove **cross-engine value before** building Chart, GeoMap, Timeline, and Diagram renderers (DESIGN §13, D8): a **minimal Timeline stub** drives a **Visual `focus`** through the shared event bus — never through engine-to-engine imports. Ship: (1) a frozen `composition.schema.json`, (2) a composition runtime in `interactive-engine` that loads a lesson, instantiates multiple engine instances, and routes namespaced events to D5 actions on peer instances, (3) a Timeline stub engine package that parses the thin `engines/timeline/SPEC.md` event list and emits `timeline.event-selected` on `select`, (4) a frozen canonical fixture (`narrative-timeline-visual.json`), and (5) conformance e2e with a replayable event log.

**Non-goals (hard). Do NOT:**
- Build full Timeline, GeoMap, Chart, or Diagram renderers. The Timeline stub is event/state-only; there is **no timeline UI/layout/SVG** at P2.5 (PLAN.md P2.5 non-goal, DESIGN §14 P2.5 row).
- Import any engine package from another (D2/§6): `visual-engine` MUST NOT import `timeline-engine` or vice versa; cross-engine behavior is routed by the composition runtime in `interactive-engine` only.
- Import `@open-edu/*`; stay standalone `@knowledgeassemble/*` until P7 (PLAN.md §9.1).
- Add lesson-level quiz scoring, hints, or workflow (D7). Fixture engine specs keep `questions: []`; scoring is OpenEdu-owned.
- Add runtime dependencies beyond what P1/P2 allow (`zod`). The composition runtime and Timeline stub use the existing core; no new deps.
- Add non-D5 action names or resurrect superseded verbs (`highlight`, `show`, `annotate`, `scrub` as a spec verb, `click` in specs). `step`/`play-pause` are D5 `$defs.actionType` values and are fine.
- Extend the Visual closed set casually. Adding the minimal `illustration` kind (T3) is a **deliberate, documented, decision-gated exception** (T0) that the canonical fixture already requires (Visual SPEC §9 lists `illustration`; the code `VISUAL_KINDS` does not). If reviewers reject it, the fallback is a fixture amendment, never silent broadening.

**Non-negotiables (carried from P1/P2, extended for Composition).**
- `additionalProperties:false` on the composition schema AND every nested object (P11).
- Shared §67 error codes only: `INVALID_SPEC`, `INVALID_REFERENCE`, `INVALID_ENTITY`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `ACCESSIBILITY_ERROR`. Composition wiring failures use these — never bespoke codes.
- D5 semantic actions only; renderer input (`click`, `pointer.*`) never appears in specs or bindings (DESIGN §7.4). Event names in bindings are **namespaced result events** (`timeline.event-selected`), not raw actions (DESIGN §13, INTERACTIVE-ENGINE-SPEC §22).
- Event-only mutation through the shared reducer/`EventLog`; the resulting log is serializable and replayable (P4). Composition forwarding is a deterministic function of `(event, binding)`.
- Semantic-first: timeline `content.events[]` and visual `content.entities[]` describe meaning (id/label/date), never coordinates.
- Provenance (DESIGN §9): dates and labels come from the fixture data; the stub never invents events or values.

---

## 1. Foundation: prereqs, branch, conventions

### 1.1 Prerequisite reconciliation — P2 must be landed and its exit gate green

The repo currently shows **inconsistent P2 bookkeeping** (observed on branch `feat/nodenext-bundlerless-publishing`):

- `docs/PLAN.md:127` — heading reads `### P2 — Visual Engine — DONE`.
- `docs/PLAN.md:379` — §10 status board still reads `| P2 — Visual Engine | NOT STARTED |`.
- `docs/PLAN.md` §11 change log has **no P2 DONE line** (only P0/P1 entries).

Per AGENTS.md (`A phase is only marked DONE in PLAN.md when its full exit gate is green — evidence over assertion`), before any P2.5 work:

1. Confirm the P2 branch (`feat/nodenext-bundlerless-publishing`, head includes `fa9dc4e P2 review fixes…`, `791ef65 P2 T1-T9…`) has passed the full gate: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`, and has been merged to `main` via PR (`gh pr merge <n> --merge --delete-branch`).
2. Fix PLAN.md bookkeeping on `main`: §10 status board `P2 → DONE`; add the §11 change-log line matching existing style (e.g. `2026-09-07 | P2 DONE: @knowledgeassemble/visual-engine number-line slice → accessible SVG, L1–L4 conformance, closed component set green via full exit gate.`).

If the gate is not green, stop: fix P2 first. P2.5 builds directly on P2's `visual-engine` and must not paper over a failing P2.

### 1.2 Branch strategy

```text
git switch main && git pull
git switch -c feat/p2.5-composition
```

If P2 has not merged yet, branch from the merged tip of the P2 PR instead, and land P2 before opening the P2.5 PR. Commit per task with the repo style (`P2.5 T<nn>: <one-liner>`).

### 1.3 Grounded current state (verified on disk)

| Asset | Location | Status |
|---|---|---|
| Composition schema | `docs/schemas/composition.schema.json` | Stub, `additionalProperties:false`, `{id, title?, engines[], bindings[]}`; header says "Stub frozen at P2.5" |
| Canonical fixture | `docs/fixtures/composition/narrative-timeline-visual.json` | Proposed; timeline stub spec + visual spec + 1 binding; fixture README marks it "Proposed" |
| Timeline normative spec | `docs/engines/timeline/SPEC.md` | Thin (69 lines), MVP `content.kind: events`, emits `timeline.event-selected` on D5 `select` |
| Composition placeholder | `packages/interactive-engine/src/composition/README.md` | "Filled at P2.5" |
| P1 core public surface | `packages/interactive-engine/src/index.ts` | `EngineRegistry`, `createPlatformInstance`, `EventLog`, `runPipeline`, `validateEnvelope`, `EngineError`/`ERROR_CODES`, `ACTION_TYPES` |
| P2 visual surface | `packages/visual-engine/src/index.ts`, `schema.ts` | `VisualEngine`, `VISUAL_KINDS` (8 kinds — `illustration` absent) |
| Conformance routing | `apps/conformance/src/main.ts` | `?engine=` query; `core` + `visual` routes; `window.__harness`/`__visualHarness` |
| Visual agent skill | `docs/engines/visual/skills/educational-visual/SKILL.md` | Exists (P2 T9) |

### 1.4 Decision gates to close at T0 (record in PLAN.md §11 before implementing)

- **Gap A — `illustration` is not a registered Visual kind.** The canonical fixture's visual spec (`narrative-timeline-visual.json:44-64`) uses `content.kind: "illustration"` and `content.entities[]`, but `packages/visual-engine/src/schema.ts:3-12` `VISUAL_KINDS` lists only `number-line, counting-set, fraction, fraction-comparison, clock, coordinate-grid, geometry, comparison`. Visual SPEC §9 vocabulary **does** include `illustration`. Plan **default (recommended):** complete the spec — add `illustration` to `VISUAL_KINDS` + a minimal scene builder (a group of labeled, `focus`/`select`-able entity nodes; no geometry) and keep `docs/PLAN-P2.md` §3 + `schema-parity` in sync. **Fallback (reviewer rejection):** amend the fixture's visual spec to an existing kind (e.g. `comparison` or a number-line) and set `links.visualEntityId` to a derived entity id; the fallback must be a fixture-only change.
- **Gap B — binding target payload must carry `links.visualEntityId`.** The fixture binding (`narrative-timeline-visual.json:67-77`) resolves the target via `targetIdFrom: "links.visualEntityId"`, i.e. it reads a dot-path off the **event-record field**, which is `content.events[].links.visualEntityId`. The Timeline stub (T2) MUST attach the selected event's full entity record (including `links`) to the emitted event so the path resolves. Encode this in the stub's reducer and assert it in tests.

---

## 2. The composition contract (freeze at this phase)

`docs/schemas/composition.schema.json` is the canonical contract. At P2.5 it stops being a stub:

1. **Description/status wording:** replace "Stub frozen at P2.5" with the normative framing ("Normative at P2.5"; embedded engine specs MUST also validate against `interactive-engine.schema.json`).
2. **Shape (unchanged):** lesson `{ id, title?, engines[], bindings[] }`; `engines[]` = `{ instanceId, engine<i-enum>, spec }`; `bindings[]` = `{ on<namespaced>, from, dispatch: { to, action<$defs.actionType>, targetIdFrom? | targetId? } }`.
3. **Rules to enforce in the runtime (T1), even where the schema only documents them:**
   - `engines[].engine` MUST equal `engines[].spec.type` (schema documents it in a `description` only — the runtime hard-checks it) → else `INVALID_SPEC`.
   - `bindings[].on` matches `^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$` (namespaced result event), e.g. `timeline.event-selected` (mirrors P2 event naming `visual.<entity>-<result>`, DESIGN line 263).
   - `dispatch.action` is a D5 `actionType` (the schema `$ref` already guarantees it; runtime re-checks against the shared `ACTION_TYPES` + the target engine's `interaction.actions`).
   - `targetIdFrom` is a **dot-separated field path on the event payload** (e.g. `links.visualEntityId`); exactly one of `targetIdFrom`/`targetId` resolves.
   - Every embedded `spec` passes **L1** on `interactive-engine.schema.json` (PLAN.md P2.5 exit criterion 3); the Visual spec additionally passes Visual L2 (for which `illustration` must exist — Gap A).
4. **Replayability:** forwarded events re-enter the same `EventLog`/host `onEvent` stream; a replayed log reproduces the identical snapshot sequence (P4).

---

## 3. Task list (implement in this order; commit after each)

### T0 — Prerequisites, decision-gating, contract freeze
- Verify + reconcile P2 bookkeeping (§1.1). Land P2 on `main` if needed.
- Record the Gap A + Gap B decisions (§1.4) in `docs/PLAN.md` §11 change log before implementation (contract-conscious: they are scope notes, not silent changes).
- Freeze `composition.schema.json` status wording (§2.1); set `docs/fixtures/composition/README.md` status "Proposed" → "Normative (P2.5)".
- Update `docs/engines/visual/skills/educational-visual/SKILL.md` `Do NOT` list if needed to keep parity with the P2.5 fixture (only if the `illustration` decision lands).

**Done when:** PLAN.md §10 shows P2 `DONE`; §11 change log has the P2 line + two P2.5 decision lines; composition schema header and fixture README no longer say "Stub"/"Proposed".

### T1 — Composition runtime in `interactive-engine` (lesson loader + event router)
Files: `packages/interactive-engine/src/composition/lesson.ts`, `packages/interactive-engine/src/composition/router.ts`, test-first `packages/interactive-engine/test/composition.test.ts` (and update `src/composition/README.md`).

- **`load(spec)`** — validates the lesson object against the Zod port of `composition.schema.json` (`INVALID_SPEC`), then L1-validates **every** embedded `engines[].spec` via `validateEnvelope` (`INVALID_SPEC`), checking `engines[].engine === spec.type`.
- **`start(host)`** — for each `engines[]` entry, resolve the engine implementation from `EngineRegistry` (`get(engine)`; unknown → `UNSUPPORTED_ACTION` at L1-review time or `INVALID_REFERENCE` per code conventions — pick one shared code and assert it), `instantiate(spec, host)`, index instances by `instanceId`. `stop()` tears each instance down.
- **Router** — for each binding, subscribe to the `from` instance's emitted events. On event name === `bindings.on`:
  1. resolve target id: `targetIdFrom` dot-path on the event payload → else `targetId`; unresolvable → `INVALID_REFERENCE`.
  2. dispatch `{ type: dispatch.action, target: { id } }` to the `to` instance.
  3. prefixed domain events flow through the shared `EventLog` (host `onEvent`), so the harness can replay.
  4. deterministic: same event → same forwarded action, byte-stable.
- Public exports from `packages/interactive-engine/src/index.ts`: `Lesson` (or `composition/…` type + factories) + a `COMPOSITION` affordance. Keep internals unexported.

**Done when (test-first):** `load(canonicalFixture)` is valid; dispatching `select` on instance `timeline-independence` with target `event-1947` emits `timeline.event-selected` carrying `links.visualEntityId === 'figure-independence'`, and the router then dispatches `focus` to `visual-independence` with target `figure-independence`; `snapshot('visual-independence')` shows `figure-independence` in `focus`; `EventLog` replay reproduces the same snapshot; an unknown `to` instance or unresolved `targetIdFrom` raises a shared code; a lesson whose `engines[].engine !== spec.type` is rejected `INVALID_SPEC`.

### T2 — Timeline stub engine (minimal, no renderer)
Files: `packages/timeline-engine/` mirroring the P2 package shape: `package.json` (`@knowledgeassemble/timeline-engine`, deps only `interactive-engine` + `zod`), `tsconfig.json`, `vitest.config.ts`, `src/schema.ts` (thin Zod: `content.kind: z.literal('events')`, `events[] {id,label,date,links?}` strict), `src/engine.ts` (`TimelineEngine implements Engine`), `src/reducer.ts` (extends `baseReducer`; handles `select`, `focus`, `play-pause`, `step`, `reset`), `src/index.ts`; test `packages/timeline-engine/test/timeline.test.ts`; register in `pnpm-workspace.yaml` (packages/* already covers).

- Envelope: `type: 'timeline'` (`validate` = `validateEnvelope` L1 + thin L2: kind `events`, event ids unique + id-pattern).
- **On D5 `select` of an event id:** emit the namespaced result event `timeline.event-selected` with `engineId: <instanceId>`, `target: { id, type: 'event' }`, plus the **full entity record** as payload so `links.visualEntityId` (Gap B) resolves on a `links` field path. Suggested slot: event `action/payload` carries the entity (mirror how P2 namespaced events; keep it explicit in the reducer test).
- `play-pause` / `step` MUST NOT emit `timeline.event-selected` (they drive playback state only). `focus`/`reset` are accepted; `scrub` is NOT in the P2.5 MVP (spec lists it for P5) → `UNSUPPORTED_ACTION` at P2.5.
- No layout/render/SVG. Deterministic, no wall clock/timers even for `play-pause` (queue step index only).

**Done when (test-first):** `select event-1947` → `timeline.event-selected` with `target.id === 'event-1947'` and resolvable `links.visualEntityId`; unknown event id → `INVALID_ENTITY`; `scrub` → `UNSUPPORTED_ACTION`; `EngineRegistry.get('timeline')` returns the stub after registration; full visual fixture's timeline spec validates L1.

### T3 — Visual `illustration` kind (default Gap A path)
Files: `packages/visual-engine/src/schema.ts` (`VISUAL_KINDS` += `'illustration'`; `entities` array on `VisualContentSchema` — `{id,label}` strict), `packages/visual-engine/src/components/illustration.ts` + registry entry, scene builder + a11y labels, `schema-parity` test (VISUAL_KINDS parity), negative tests.

- `illustration` scene: one `group` node (`role:'visual'`) with one child per `entities[]` entry: `id` = entity id, `role:'selectable'`, `interactive:true`, `acceptsActions:['select','focus']`, `label` from entity (or via host locale).
- Keep it dependency-minimal and deterministic; no geometry requirement (labels layout left-aligned; no pixel authoring).
- If **Fallback B** (T0) is chosen instead, skip T3 and amend the fixture in T1 (visual spec uses an existing kind whose entity id equals the binding's `targetId`).

**Done when (test-first):** the canonical fixture's visual spec validates (`kind:'illustration'` + `entities[]`); `instantiate` on `visual-independence` yields a scene with node `figure-independence` marked `acceptsActions:['select','focus']` and a non-empty label; an unknown kind still fails; `VISUAL_KINDS` parity test green.

### T4 — Fixture freeze + golden event log
- Freeze `docs/fixtures/composition/narrative-timeline-visual.json` (no further edits without a PLAN note).
- Check in golden artifacts under `packages/interactive-engine/test/fixtures/composition/`: `narrative-timeline-visual.golden.json` — the **exact event sequence** (`seq` monotonic, names in order: e.g. `engine-mounted`, `…`,`state-changed`, `timeline.event-selected`, `visual.<entity>-focused`, `interaction-completed`) and the end snapshot for the smoke interaction (select `event-1947`).
- Add a parity test that the runtime's deterministic output over the fixture byte-matches the golden file (assert across two runs).

**Done when:** golden file checked in; the two-run determinism + golden-parity test green; fixture validates against `composition.schema.json` (schema test, not just manual runner).

### T5 — Conformance harness + browser e2e
Files: `apps/conformance/src/main.ts` + `apps/conformance/src/composition.ts` (`?engine=composition` route), `packages/interactive-engine/e2e/composition.spec.ts`.

- Route: load the canonical fixture through the T1 `Lesson`; render the Visual instance's SVG into the DOM (mirror P2 `visual` route) and expose `window.__compositionHarness` with `dispatch(instanceId, action)`, `snapshot(instanceId)`, `events()`, `svg(instanceId)`, `tryCreate(lesson)` — mirroring the existing `window.__harness` shape.
- Playwright specs:
  1. **interaction** — activate (keyboard/pointer) `event-1947` on the timeline list → assert `snapshot('visual-independence')` shows `figure-independence` focused; `events()` contains `timeline.event-selected` then `visual.figure-independence-focused` in seq order.
  2. **replay** — replay the log through the core `EventLog` and assert the same final snapshot (deterministic).
  3. **a11y** — the focused visual entity has a non-empty `aria-label`/text and a role; nothing conveys meaning by color alone (reuse the P2 a11y assertions shape).
  4. **rejection** — `tryCreate` of a malformed lesson (unknown binding target, `engine !== spec.type`, non-D5 action) fails with a shared code.

**Done when:** all four specs green in a real browser against the installed `timeline-engine` + `visual-engine` + `interactive-engine`.

### T6 — Agent skill for composition authoring
- Extend `docs/engines/visual/skills/educational-visual/SKILL.md` — or add a sibling `docs/engines/composition/skills/composition/SKILL.md` (match the repo skill convention; check `PLAN-P2.md` T9's chosen home) — teaching: when to compose vs reuse a single engine, the binding shape (`on`/`from`/`dispatch`), namespaced-result-event naming, `targetIdFrom` dot-path payload requirement (Gap B), D5-action-only, `engine === spec.type`, and that cross-engine MUST go through the lesson bus, never imports.
- Bounded proof: the skill's canonical example round-trips `Lesson.load` valid.

**Done when:** skill exists; its example JSON is checked in under the composition fixtures and passes `composition.schema.json` + embedded-L1 validation in a unit test.

### T7 — Doc reconciliation + exit-gate clean
- `docs/fixtures/composition/README.md`: "Normative (P2.5)", validation commands (`composition.schema.json` L1 + embedded `interactive-engine.schema.json` L1).
- `packages/interactive-engine/src/composition/README.md`: replace "Filled at P2.5" with the actual runtime contract (load/route/replay).
- `docs/PLAN.md` §10 status board: `P2.5 → DONE` **only after** the gate below is green; add §11 change-log lines (P2.5 DONE + the T0 decisions).
- Run guardrail greps (below) and the full exit gate.

**Done when:** full exit gate green (see §4); PLAN.md change log + status board consistent.

---

## 4. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P2.5 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Playwright (or unit): select timeline event → visual entity focused; event log replayable | T1 composition unit test + T5 `e2e/composition.spec.ts` interaction + replay; golden event log (T4) |
| 2 | No engine-to-engine package imports; routing only through harness bindings | Guardrail grep below (`packages/*/src` imports); router dispatches only via the T1 `Lesson`, never direct engine calls |
| 3 | Fixture validates against `composition.schema.json`; embedded engine specs pass L1 on envelope schema | T1 `load()` + T4 parity test; `validateEnvelope` per `engines[].spec` in `load()` |

**Self-checks (all MUST pass, not just the three PLAN criteria):**
- **No engine smuggling:** `grep -rn "from '@knowledgeassemble/timeline-engine'" packages/visual-engine packages/interactive-engine` → empty; and the reverse in `packages/timeline-engine`.
- **Deps unchanged:** `packages/interactive-engine/package.json` and `packages/timeline-engine/package.json` depend only on shared workspace packages + `zod`; no `@open-edu/*`.
- **Shared error codes only:** emitted codes ⊆ §67 set (unit tests + grep of thrown `EngineError` codes).
- **Determinism:** T4 two-run parity test green; no `Date.now|Math.random|performance.now` in `timeline-engine/src` or composition runtime.
- **D6:** no telemetry/store/Studio/scoring modules added; `questions` stay empty arrays in fixtures.

---

## 5. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not build a Timeline renderer at P2.5.** No SVG/layout/HTML in `timeline-engine`; the stub is state + events only (PLAN.md "no full timeline renderer required for exit" is a floor, not a ceiling).
2. **No engine-to-engine imports, ever.** The only consumer of `timeline-engine` is the composition runtime in `interactive-engine` + the conformance app + tests.
3. **No new runtime deps.** Everything reuses `interactive-engine` public surface (`EngineRegistry`, `createPlatformInstance`/`Engine`, `EventLog`, `validateEnvelope`, `EngineError`/`ERROR_CODES`, `ACTION_TYPES`).
4. **D5-only vocabulary.** Bindings dispatch `focus`/`select`/`reset`/…; event names in `on` are **namespaced results**, not raw actions. No `highlight`/`show`/`annotate`/`click` anywhere.
5. **Never bypass the router.** A test that calls `visualInstance.dispatch` from timeline code is a composition violation — review-reject it. Routing is the `Lesson`'s job.
6. **Gap B is load-bearing.** If the selected event's `links` does not reach the emitted `timeline.event-selected` payload, `targetIdFrom: "links.visualEntityId"` cannot resolve and the smoke test fails. Assert it at T1/T2.
7. **`illustration` is decision-gated.** Do not add any other new Visual kind; if T0 takes the fallback, T3 is skipped and the fixture is amended instead — never widen `VISUAL_KINDS` beyond `illustration`, and keep `schema-parity` green.
8. **Determinism everywhere.** No wall clock even for the stub's `play-pause`; no randomness in scene/layout/event playback.
9. **Shared codes only.** Use §67 codes (`INVALID_SPEC`, `INVALID_REFERENCE`, `INVALID_ENTITY`, `INVALID_ACTION`, `UNSUPPORTED_ACTION`, `INVALID_STATE`, `ACCESSIBILITY_ERROR`).
10. **`.js` import specifiers** in all new packages (NodeNext); `src/index.ts` is the only public surface of each package.
11. **Test-first.** Every task T1–T6 starts with its failing test/fixture; "done" means that test passes (P1/P2 convention).
12. **Composition lives in `interactive-engine`, not the engines.** Engines remain engine-isolated (D2); only `packages/interactive-engine/src/composition/*` knows about lessons and bindings.

---

## 6. Definition of Done (P2.5-specific)

P2.5 is complete when:

- `docs/PLAN.md` §4 P2.5 exit criteria 1–3 are green, verified by the §4 gate commands (not assertion).
- `packages/timeline-engine` (stub), the composition runtime in `interactive-engine`, and `packages/visual-engine` (`illustration`, per T0 decision) all pass `typecheck`, `lint`, unit tests, and browser e2e.
- `composition.schema.json` is frozen (no "Stub") with embedded specs L1-validated in `load()`.
- The canonical fixture is frozen with a checked-in golden event log; two-run determinism asserted.
- Conformance `?engine=composition` e2e is green; the composition skill example round-trips validation.
- `docs/PLAN.md` marks P2.5 **DONE** and logs the change (including the T0 decisions).

Do **not** start P3 until the §4 gate is green.
