# Phase 1 — Platform Skeleton: Detailed Implementation Plan

**File:** `docs/PLAN-P1.md`
**Status:** Detailed task breakdown for the P1 phase (supersedes nothing; expands `docs/PLAN.md` §4 P1)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P1
**Do this first:** read, in order — `docs/DESIGN.md` (§4, §5, §7, §11, §12.1), `docs/schemas/interactive-engine.schema.json`, `docs/INTERACTIVE-ENGINE-SPEC.md` (§15, §16, §67), `docs/PLAN.md` (§4 P1). These are normative; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Build `packages/interactive-engine` — a framework-independent TypeScript library that enforces the envelope schema, provides the D5 action/event/state runtime, the `EngineHost` seam, a11y primitives, and the four-layer validation pipeline — and prove it through a browser conformance harness. **No engine is built in P1.**

**Non-goals (hard).** Do NOT build, import, or reference:
- any engine (`visual`/`geomap`/`chart`/`timeline`/`diagram`) package or renderer
- React (library stays framework-independent; React arrives at P7)
- a telemetry store, i18n catalog, theme editor, Studio app, scoring engine, or RxJS product (D6 — OpenEdu owns these)
- any runtime dependency other than `zod` (dev-deps: vitest, typescript, playwright, vite, eslint, prettier)

**Non-negotiables.** `additionalProperties:false` semantics; shared error codes (§67); deterministic reducer (no `Date.now`, no `Math.random`, no wall clock in state/events); event-only state mutation; renderer input never appears in the API surface.

---

## 1. Repo and versions

Scaffold a pnpm workspace at the repo root. Pin: Node ≥ 20, pnpm ≥ 9, TypeScript `^5.6` (strict), Zod `^3.23`, Vitest `^2`, Playwright `^1.48`, Vite `^6`.

Root files to create:

```text
package.json                # root: private, scripts + devDeps
pnpm-workspace.yaml         # packages: ['packages/*', 'apps/*']
tsconfig.base.json          # shared strict compiler options
.gitignore                  # already exists; add dist/, node_modules/, playwright-report/, test-results/
```

Root `package.json` scripts (used by the P1 exit gate):

```json
{
  "name": "openedu-interactive",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "playwright": "pnpm -r playwright"
  }
}
```

`tsconfig.base.json` minimum:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "noEmit": true
  }
}
```

---

## 2. Package layout

Create exactly this tree inside `packages/interactive-engine/`:

```text
packages/interactive-engine/
  package.json                 # name: @knowledgeassemble/interactive-engine
  tsconfig.json                # extends ../../tsconfig.base.json
  vitest.config.ts
  playwright.config.ts
  src/
    index.ts                   # public exports
    schemas/
      interactive-engine.schema.json   # canonical copy from docs/schemas/
      actions.ts               # ACTION_TYPES const + ActionType
      envelope.zod.ts          # Zod mirror of the envelope
      envelope.ts              # EngineSpec type = z.infer<...>
    core/
      engine.ts                # Engine, EngineInstance interfaces
      host.ts                  # EngineHost
      action.ts                # EngineAction
      event.ts                 # EngineEvent + event names
      state.ts                 # EngineState + base state shape
      errors.ts                # EngineError, ErrorCode
      registry.ts              # EngineRegistry
    runtime/
      reducer.ts               # baseReducer (pure, deterministic)
      event-log.ts             # append + replay
      instance.ts              # createPlatformInstance
    accessibility/
      primitives.ts            # a11y node + a11yTreeOf(snapshot)
    validation/
      validate.ts              # validateEnvelope (L1)
      pipeline.ts              # runPipeline L1->L4 hooks
    composition/
      README.md                # placeholder; filled at P2.5
  test/                        # Vitest specs (unit + integration)
    actions.test.ts
    reducer.test.ts
    event-log.test.ts
    registry.test.ts
    validate.test.ts
    schema-parity.test.ts
apps/conformance/              # vanilla-TS Vite app, browser target for Playwright
  package.json                 # name: @knowledgeassemble/conformance (private)
  tsconfig.json
  vite.config.ts
  index.html
  src/main.ts
```

`packages/interactive-engine/package.json`:

```json
{
  "name": "@knowledgeassemble/interactive-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": { "zod": "^3.23.0" },
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src test",
    "test": "vitest run",
    "playwright": "playwright test"
  }
}
```

Copy `docs/schemas/interactive-engine.schema.json` → `packages/interactive-engine/src/schemas/interactive-engine.schema.json` verbatim. It is the canonical public contract; do not edit its semantics. Add a `test/schema-parity.test.ts` that reads it and asserts parity with the Zod schema (see §6).

---

## 3. Task list (implement in this order; commit after each)

### T1 — Workspace scaffold
Create root files (§1). Run `pnpm install` (creates lockfile). Verify `pnpm -r typecheck` runs (no packages yet → trivially green).
**Done when:** `pnpm install` succeeds; `pnpm-workspace.yaml` exists.

### T2 — Schemas: actions + Zod envelope + types
Files: `schemas/actions.ts`, `schemas/envelope.zod.ts`, `schemas/envelope.ts`.

`schemas/actions.ts` — single source of truth for the D5 enum (DESIGN §7.4):

```ts
export const ACTION_TYPES = [
  'select','deselect','focus','unfocus',
  'filter','clear-filter',
  'open-annotation','close-annotation',
  'answer','compare',
  'toggle','expand','collapse',
  'zoom','pan','scrub','jump-to',
  'play-pause','step',
  'drag','drop','place','move','connect','disconnect','follow',
  'reset'
] as const;
export type ActionType = typeof ACTION_TYPES[number];
```

`schemas/envelope.zod.ts` — a Zod schema that mirrors `interactive-engine.schema.json` exactly. Required: `type` (regex `^[a-z][a-z0-9-]*$`), `version` (semver regex from the JSON Schema), `id` (regex `^[a-zA-Z][a-zA-Z0-9._-]*$`, 1–128 chars). Include the optional sections and **set `.strict()` on every object** (equivalent of `additionalProperties:false`). Mirror these `$defs` verbatim: `metadata`, `purpose` (require `learningObjective`; optional `interactionGoal`, `reasoningMode`), `layout`, `interaction` (enum `mode`; `actions` = array of `ActionType`; `guided`, `allowReset`, `allowUndo`, `allowRedo`), `question`, `feedback`, `accessibility` (require `label`), `appearance`+`motion`, `source`, `resource`, `reference`, `completion`+`condition`, `events`+`eventDefinition`.

`schemas/envelope.ts`:

```ts
import { EnvelopeSchema } from './envelope.zod.js';
export type EngineSpec = z.infer<typeof EnvelopeSchema>;
```

**Done when:** `EngineSpec` type-checks; a Zod parse of the DESIGN §4 canonical example passes, and an object with an unknown key / `skill` in `purpose` / `"highlight"` in `interaction.actions` fails with a Zod error.

### T3 — Core types and errors
Files: `core/errors.ts`, `core/action.ts`, `core/event.ts`, `core/state.ts`, `core/host.ts`, `core/engine.ts`, `core/registry.ts`.

`core/errors.ts` (contract §67 — use exactly these codes, never bespoke ones):

```ts
export const ERROR_CODES = [
  'INVALID_SPEC','INVALID_VERSION','INVALID_ENTITY','INVALID_REFERENCE',
  'INVALID_ACTION','INVALID_STATE','UNSUPPORTED_ACTION','RESOURCE_ERROR',
  'ACCESSIBILITY_ERROR'
] as const;
export type ErrorCode = typeof ERROR_CODES[number];

export class EngineError extends Error {
  readonly code: ErrorCode;
  readonly targetId?: string;
  constructor(code: ErrorCode, message: string, targetId?: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.targetId = targetId;
  }
  toJSON() { return { error: { code: this.code, message: this.message, ...(this.targetId ? { targetId: this.targetId } : {}) } }; }
}
```

`core/action.ts` (contract §16):

```ts
import type { ActionType } from '../schemas/actions.js';
export interface EngineAction {
  type: ActionType;
  target?: { id: string };
  targets?: { id: string }[];
  payload?: unknown;
}
```

`core/event.ts` (DESIGN §7.2, §7.4). Ordering uses a monotonic `seq` (deterministic), not wall clock:

```ts
export interface EngineEvent {
  id: string;               // `${instanceId}:${seq}`
  seq: number;              // monotonic per-instance counter
  name: string;             // lifecycle or `<engine>.<entity>-<result>`
  instanceId: string;
  action?: EngineAction;    // present when caused by a dispatch
  data?: Record<string, unknown>;
}
export const LIFECYCLE_EVENTS = [
  'engine-mounted','engine-ready','engine-reset','state-changed',
  'interaction-started','interaction-completed'
] as const;
```

`core/state.ts` — base runtime state (engine reducers extend it later):

```ts
import type { EngineType } from './engine.js';
export interface EngineState {
  instanceId: string;
  engine: EngineType;
  phase: 'registered' | 'validated' | 'running' | 'torn-down';
  selection: string[];
  focus: string | null;
  filter: string[];
  annotations: Record<string, 'open' | 'closed'>;
  expanded: string[];
  playback: 'playing' | 'paused' | 'stopped';
  step: number;
  lastAction: EngineAction | null;
}
export function initialState(instanceId: string, engine: EngineType): EngineState { /* ... */ }
```

`core/host.ts` (D6 — exact seam from DESIGN §12.1):

```ts
import type { EngineEvent } from './event.js';
export interface EngineHost {
  locale: string;                            // BCP 47
  tokens: Record<string, string>;            // host theme tokens
  reducedMotion: boolean;
  announce(message: string): void;
  onEvent(event: EngineEvent): void;
  resolveAsset(id: string): string | Uint8Array;
}
```

`core/engine.ts` (DESIGN §7.3 lifecycle):

```ts
import type { EngineSpec } from '../schemas/envelope.js';
import type { EngineAction } from './action.js';
import type { EngineEvent } from './event.js';
import type { EngineState } from './state.js';
import type { EngineHost } from './host.js';
import type { ValidationResult } from '../validation/pipeline.js';

export type EngineType = 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram';

export interface EngineInstance {
  readonly id: string;
  readonly engine: EngineType;
  dispatch(action: EngineAction): void;                 // event-only mutation
  snapshot(): Readonly<EngineState>;
  subscribe(fn: (e: EngineEvent) => void): () => void;  // returns unsubscribe
  teardown(): void;
}

export interface Engine {
  readonly type: EngineType;
  validate(spec: EngineSpec): ValidationResult;         // envelope + engine schema
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
```

`core/registry.ts`:

```ts
import type { Engine, EngineType } from './engine.js';
export class EngineRegistry {
  private engines = new Map<EngineType, Engine>();
  register(engine: Engine): void;
  get(type: EngineType): Engine | undefined;
  list(): EngineType[];
}
```

**Done when:** all types compile; `EngineRegistry` unit-tests pass (register/get/list/duplicate-register throws).

### T4 — Runtime: reducer + event log + instance
Files: `runtime/reducer.ts`, `runtime/event-log.ts`, `runtime/instance.ts`.

`runtime/reducer.ts` — a pure, deterministic `baseReducer(state, action)`. Rules:
- Unknown `action.type` (not in `ACTION_TYPES`) → throw `EngineError('UNSUPPORTED_ACTION', …)`.
- Transitions (state change; every accepted action also emits a `state-changed` event — see instance):

| action | state change |
|---|---|
| `select` | add `target.id` to `selection` (dedupe, preserve order) |
| `deselect` | remove `target.id` from `selection` |
| `focus` | `focus = target.id` |
| `unfocus` | `focus = null` |
| `filter` | `filter = (payload?.ids as string[]) ?? []` |
| `clear-filter` | `filter = []` |
| `open-annotation` / `close-annotation` | set `annotations[target.id]` |
| `toggle` / `expand` / `collapse` | toggle/add/remove `target.id` in `expanded` |
| `zoom` / `pan` / `scrub` / `jump-to` | no base state (engine-specific); accept + record `lastAction` |
| `play-pause` | toggle `playback` playing↔paused (stopped→playing) |
| `step` | `step += 1` (if paused) |
| `drag`/`drop`/`place`/`move`/`connect`/`disconnect`/`follow` | no base state; accept + record `lastAction` |
| `answer` / `compare` | no base state (D7 — OpenEdu scores); record `lastAction` |
| `reset` | return `initialState` (preserving `instanceId`/`engine`/`phase: 'running'`) |

The reducer is pure: returns a new `EngineState`; never mutates its input.

`runtime/event-log.ts` — append + replay:

```ts
export class EventLog {
  private events: EngineEvent[] = [];
  private seq = 0;
  append(name: string, instanceId: string, data?: Record<string, unknown>, action?: EngineAction): EngineEvent;
  list(): readonly EngineEvent[];
  replay(): readonly EngineEvent[];   // same order, immutable copy
}
```

`runtime/instance.ts` — `createPlatformInstance(spec, host, id?)`: validates the spec (L1 via `validateEnvelope`), builds `initialState`, wires the reducer + event log, exposes `dispatch/snapshot/subscribe/teardown`. On `dispatch`:
1. record `interaction-started` event,
2. run `baseReducer`,
3. append a `state-changed` event with the action,
4. call `host.onEvent` for every emitted event,
5. if `host.reducedMotion`, `announce` on selection/focus changes only.

**Done when:** reducer tests cover every action row above + determinism (two dispatches of the same sequence yield identical snapshots); event-log replay returns events in order; instance `dispatch` rejects an unknown action with `UNSUPPORTED_ACTION`.

### T5 — Validation: L1 + pipeline
Files: `validation/validate.ts`, `validation/pipeline.ts`.

`validation/validate.ts` — `validateEnvelope(spec: unknown): ValidationResult` using the Zod schema; map Zod issues to `INVALID_SPEC` (structure), `INVALID_VERSION` (version pattern), `INVALID_REFERENCE` (bad `id`/reference pattern).

`validation/pipeline.ts` — the four accumulating layers (DESIGN §11):

```ts
export type ValidationLevel = 'L1' | 'L2' | 'L3' | 'L4';
export interface ValidationIssue { level: ValidationLevel; code: ErrorCode; message: string; path?: string; }
export interface ValidationResult { valid: boolean; issues: ValidationIssue[]; }
export interface ValidationHooks {
  semantic?: (spec: EngineSpec) => ValidationResult;       // L2
  layout?: (spec: EngineSpec) => ValidationResult;         // L3
  accessibility?: (spec: EngineSpec) => ValidationResult;  // L4
}
export function runPipeline(spec: unknown, hooks?: ValidationHooks): ValidationResult;
```

`runPipeline` runs L1 (`validateEnvelope`); if L1 fails, return immediately (accumulating layers — no L2/L3/L4 on an invalid envelope). Otherwise run `hooks.semantic/layout/accessibility` when provided (P1: no engine → no hooks → all pass). Default missing hooks = pass.

**Done when:** `validateEnvelope` tests pass (valid DESIGN §4 example → valid; unknown key, missing `id`, bad semver, `purpose.skill` → specific error codes); `runPipeline` short-circuits on L1 failure.

### T6 — Accessibility primitives
File: `accessibility/primitives.ts`.

```ts
export interface A11yNode {
  id: string;
  role: string;
  label?: string;
  description?: string;
  children: A11yNode[];
}
export function a11yTreeOf(state: Readonly<EngineState>): A11yNode;
```

`a11yTreeOf` returns a minimal tree: a root node `{ id: instanceId, role: 'interactive-engine', label: <metadata.title or id>, children: [] }`. It is the stable shape engines will extend. No DOM here — the library stays renderer-independent; the conformance app converts it to DOM (DESIGN §8).

**Done when:** `a11yTreeOf` returns a labeled root; label never empty (falls back to `id`).

### T7 — Public exports
File: `src/index.ts` — export everything public: `EngineType`, `ACTION_TYPES`/`ActionType`, `ERROR_CODES`/`ErrorCode`/`EngineError`, `EngineAction`, `EngineEvent`, `EngineState`/`initialState`, `EngineHost`, `Engine`/`EngineInstance`, `EngineRegistry`, `baseReducer`, `EventLog`, `createPlatformInstance`, `validateEnvelope`, `runPipeline`/`ValidationResult`, `a11yTreeOf`/`A11yNode`, `EngineSpec`.

### T8 — Conformance app (browser target)
`apps/conformance/` — a vanilla-TS Vite app (no React). `src/main.ts` imports `createPlatformInstance` + `a11yTreeOf` from `@knowledgeassemble/interactive-engine`, loads a hardcoded minimal spec (the PLAN P2 number-line envelope with `interaction.actions: ['select','focus','reset']`), creates an instance with a **stub host** (`locale:'en'`, `tokens:{}`, `reducedMotion:false`, `announce`→console, `onEvent`→log, `resolveAsset`→identity), renders the a11y tree to DOM nodes with `role`/`aria-label`, and exposes `window.__harness = { dispatch, snapshot }` for Playwright.

`playwright.config.ts` (in the package) sets `webServer` to serve `apps/conformance` (`vite dev --port 5173`).

**Done when:** `pnpm playwright` launches, loads the page, and the minimal scene renders with the correct `role` and `aria-label`.

### T9 — Conformance e2e (exit evidence)
Add Playwright specs under `packages/interactive-engine/e2e/`:
1. **lifecycle** — instance mounts, dispatches `select`, snapshot `selection` contains the id, `focus` sets focus, `reset` restores empty selection.
2. **replay** — capture emitted events, assert ordering by `seq` and that replay equals original order.
3. **a11y** — rendered node has a non-empty `aria-label`; `role` present.
4. **L1 rejection** — a spec with an unknown key is rejected (no instance created).

**Done when:** all four specs green in a real browser.

---

## 4. Schema ↔ Zod parity guardrail (T2 must include this)

`test/schema-parity.test.ts`: read `src/schemas/interactive-engine.schema.json`, then assert:
- the JSON Schema `$defs.actionType.enum` sorted == `ACTION_TYPES` sorted,
- `$defs.purpose.required` == `['learningObjective']`,
- top-level `required` == `['type','version','id']`,
- top-level `additionalProperties === false`.

This is the guardrail that keeps the canonical JSON Schema and the runtime Zod validator from drifting (the F1/F3 class of bug). It must fail loudly if someone edits one and not the other.

---

## 5. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P1 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Unknown keys rejected at L1 (`INVALID_SPEC`), not ignored (P11) | `validate.test.ts` + e2e L1-rejection spec |
| 2 | Events/state/DSL exercised through Playwright with a replay test | e2e lifecycle + replay specs |
| 3 | A11y primitives validated; host stub can set `reducedMotion` | a11y spec + `EngineHost.reducedMotion` wired in instance |
| 4 | No engine package exists; none required to pass the harness | registry unit-tested with a test-only stub; no `packages/*-engine/` |
| 5 | No telemetry store / i18n product / Studio / scoring engine (D6) | `package.json` deps: only `zod`; no such modules in `src/` |

---

## 6. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not add React or any DOM code to `packages/interactive-engine`.** DOM only lives in `apps/conformance`.
2. **Do not add a second telemetry/i18n/theme/scoring system.** The host stub is throwaway. (D6)
3. **Do not invent error codes.** Use only the §67 list. Unknown action → `UNSUPPORTED_ACTION`; malformed action → `INVALID_ACTION`; bad spec → `INVALID_SPEC`/`INVALID_VERSION`/`INVALID_REFERENCE`.
4. **Do not use wall-clock time or randomness** anywhere in the reducer/event log. Determinism (P4) is tested.
5. **Do not build any engine.** The `Engine` interface and registry are contracts only; a test-only stub engine exercises them. No `packages/visual-engine/` etc.
6. **Do not hand-edit the JSON Schema semantics** — copy it verbatim and mirror it in Zod; the parity test enforces sync.
7. **Keep `index.ts` the only public surface**; other modules import via relative paths.
8. Commit after each task T1–T9 with a one-line message matching the repo style.

## 7. Definition of Done (P1-specific)

P1 is complete when the §5 exit gate is fully green and each of T1–T9 is committed. Then update `docs/PLAN.md`: flip P1 to **DONE** in the status board, add a change-log line, and begin P2 (Visual number-line slice). Do not start P2 before the gate is green.
