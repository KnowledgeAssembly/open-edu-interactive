# OpenEdu Interactive Engine — High-Level Architecture

This document describes the **system architecture**: the runtime model, the engine contract, the validation pipeline, the composition layer, the host seam, and how the pieces ship and integrate. It is the architecture view over the contract; for the canonical design rationale and decisions see [`DESIGN.md`](DESIGN.md) (principles P1–P12, decisions D1–D9) and the shared contract in [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md). For how to work in the code and extend engines, see [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md).

## 1. The idea in one paragraph

Course authors describe **what an interactive should mean**, in declarative, renderer-independent JSON. The Interactive Engine decides **how it is rendered and how it behaves**. One contract, five engines — **Visual**, **GeoMap**, **Chart**, **Timeline**, **Diagram** — all sharing the same lifecycle, state, eventing, and validation model. OpenEdu never imports the engine; the engine is hosted through a narrow seam (`EngineHost`) and driven by dispatching *semantic* actions. Nothing about coordinates, pixels, SVG, or event handlers appears in a spec.

```
            ┌──────────────────────────────────────────────────────────┐
            │                     HOST (OpenEdu)                       │
            │   CourseRuntime · Studio · authoring skills             │
            └───────────────────────────────┬──────────────────────────┘
                                            │ OpenEduBridge (React) / EngineHost (raw)
                                            ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                  INTERACTIVE ENGINE (core, shared)                │
   │                                                                    │
   │  ┌──────────────┐   ┌───────────────┐   ┌──────────────────────┐  │
   │  │  Registry     │   │  Engine       │   │  Composition          │  │
   │  │  (type→Engine)│──▶│  contract     │◀──│  Lesson · Router      │  │
   │  └──────────────┘   └───────┬───────┘   └──────────────────────┘  │
   │                             │ instantiate / dispatch              │
   │                             ▼                                     │
   │   ┌─────────────────────────────────────────────────────────┐    │
   │   │  Validation pipeline  L1 → L2 → L3 → L4                 │    │
   │   │  Envelope → Semantic → Layout → Accessibility            │    │
   │   └─────────────────────────────────────────────────────────┘    │
   │                             │                                     │
   │                             ▼                                     │
   │   ┌─────────────────────────────────────────────────────────┐    │
   │   │  Runtime instance: reducer + event log + subscribers    │    │
   │   └─────────────────────────────────────────────────────────┘    │
   └─────────────────────────────┬──────────────────────────────────────┘
                                 │ events (serializable, replayable) / announce / snapshots
                                 ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                     ENGINE PACKAGES (engines)                     │
   │   visual · geomap · chart · timeline · diagram                     │
   │   each: validate (semantic/layout/a11y hooks) + render             │
   └────────────────────────────────────────────────────────────────────┘
```

The engine packages are deliberately **separate** from the core: they are published independently, import only the core (never each other, never `@open-edu/*`), and can be tree-shaken per engine (packaging decision D2).

## 2. Architectural principles (recap)

The architecture exists to enforce a small set of non-negotiable invariants. Every layer traces back to the principles in DESIGN §1–§16:

| Principle | What it means for the architecture |
|-----------|------------------------------------|
| **Semantic-first (P1/P2)** | Specs describe *meaning* (`focus`, `answer`, `select`), never layout (`x`, `y`, `width`, `color`) or raw artifacts. |
| **Strict schemas (P11/P10)** | `additionalProperties:false` everywhere; unknown keys are validation errors, never silently ignored. No arbitrary JS, no inline handlers, no `javascript:` URIs. |
| **D5 semantics** | Specs and `dispatch()` use the closed semantic action enum (`select`, `focus`, `filter`, `play-pause`, `answer`, …). `click`/`pointer.*`/`keyboard` are renderer *input* and never appear in specs. Superseded names (`highlight`, `annotate`, …) are banned. |
| **Events only (P4)** | State changes happen only by dispatching events; the event log is serializable and replayable. No direct mutation API. |
| **Deterministic (P4)** | Identical input → identical output. No randomness in layout, styling, or selection. |
| **Accessible by default (P6)** | Entities get roles, labels, keyboard paths; nothing is conveyed by color alone. |
| **Engine isolation (D2/§6)** | Engines never import each other or any `@open-edu/*` package. Cross-engine behavior is composition via the event bus, not imports. |
| **No second OpenEdu (D6/D7)** | No telemetry store, i18n product, Studio, scoring engine, theme source-of-truth, or assessment logic in this repo. Engines emit D5 events + snapshot; OpenEdu owns scoring/workflow/tokens/i18n. |
| **Provenance (§9)** | Factual/geographic/historical claims carry a source class (`authoritative` \| `illustrative` \| `simulated`). Never invent boundaries/values/facts absent from the data. |
| **Shared error codes (§67)** | Raise the common codes (`INVALID_SPEC`, `INVALID_ACTION`, `INVALID_REFERENCE`, `UNSUPPORTED_ACTION`, …), never bespoke ones. |

## 3. Runtime model

An **engine instance** is a deterministic state machine exposed as `EngineInstance`. The core `createPlatformInstance` (`packages/interactive-engine/src/runtime/instance.ts`) is the canonical implementation; engines may instantiate their own richer instance but must conform to the same contract.

### 3.1 Lifecycle

An instance moves through a fixed set of phases:

```
engine-mounted ──▶ engine-ready ──▶ running ──▶ torn-down
```

- `engine-mounted` / `engine-ready` are emitted immediately at instantiation.
- The instance is `running` while it can accept actions.
- `teardown()` flips state to `torn-down` and disconnects subscribers.

### 3.2 The `EngineInstance` contract

From `packages/interactive-engine/src/core/engine.ts`:

```ts
interface EngineInstance {
  readonly id: string;
  readonly engine: EngineType;            // 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram'
  dispatch(action: EngineAction): void;   // the ONLY way to change state
  snapshot(): Readonly<EngineState>;      // deterministic, serializable
  subscribe(fn: (e: EngineEvent) => void): () => void;
  teardown(): void;
}
```

**State changes only via `dispatch`.** There is no mutation API. Every dispatch produces an ordered, serializable sequence of events written to the instance's `EventLog` and emitted to `host.onEvent` and subscribers.

### 3.3 Deterministic action/state processing

`dispatch` applies the **base reducer** (`packages/interactive-engine/src/runtime/reducer.ts`) over the closed `ACTION_TYPES` enum, then:

1. appends and emits `interaction-started`
2. writes the reduced state
3. appends and emits `state-changed`
4. (engine-specific) appends/emits a **namespaced** result event, e.g. `visual.<id>-selected`
5. appends and emits `interaction-completed`
6. under reduced motion, issues a live-region `announce`

Unsupported or malformed actions throw `EngineError` before any event is written — determinism is preserved and the log stays valid.

### 3.4 The event log

The `EventLog` (serializable, replayable) records every event with a **monotonic `seq`**. Events carry `{ seq, name, instanceId, action?, state? }`. The full log for a session is the single source of truth: replay it and you reproduce the exact sequence of states (P4). Golden event logs are asserted byte-for-byte in tests.

## 4. The engine contract

An **engine** is the unit of extensibility. From `core/engine.ts`:

```ts
interface Engine {
  readonly type: EngineType;
  validate(spec: EngineSpec): ValidationResult;
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
```

An engine:
- declares its `type` (registered into an `EngineRegistry`);
- implements `validate` by running the L1–L4 pipeline with its own semantic/layout/accessibility hooks;
- implements `instantiate` by building a rich instance (e.g. the Visual engine computes its `scene`, `layout`, and an `svgResult` deterministically at instantiation).

The reference implementation to model a new engine on is `packages/visual-engine/src/engine.ts` (Visual), which decomposes cleanly into `validation/` (semantic, layout, accessibility), `scene/` (build), `layout/`, and `render/` (SVG).

### 4.1 The host seam

Engines never touch OpenEdu directly. They receive an `EngineHost` (`core/host.ts`):

```ts
interface EngineHost {
  locale: string;
  tokens: Record<string, string>;   // semantic design tokens, never literal colors
  reducedMotion: boolean;
  announce(message: string): void;  // a11y live region
  onEvent(event: EngineEvent): void; // telemetry / eventing
  resolveAsset(id: string): string | Uint8Array;
}
```

In the React integration, an `OpenEduBridge` (with a `t()`/i18n layer and client-shaped `onEvent`) is adapted to an `EngineHost` by `bridgeToHost` (`packages/interactive-react/src/bridge.ts`). The bridge is passed **into** the engine — the direction of dependency is one-way, enforcing D6.

## 5. Validation pipeline (L1–L4)

Every spec passes a layered validation (`validation/pipeline.ts`). Lower levels gate higher ones: a failure at L1 returns immediately with the issue, never running later stages.

```
L1 Envelope      validateEnvelope  — JSON Schema: type/version/id, closed enums
L2 Semantic      engine hook       — meaning: references resolve, kinds valid, no contradictions
L3 Layout        engine hook       — placements/geometry coherent, deterministic constraints
L4 Accessibility engine hook       — roles, labels, focus/keyboard path present
```

`ValidationResult` carries an ordered list of `ValidationIssue` with a shared `ErrorCode` and a `path`, so a consumer can surface precise authoring errors. The pipeline shape is fixed in the core; the L2–L4 hooks are where engines express their domain rules.

## 6. Composition layer

A **lesson** binds multiple engine instances so that an action on one can drive another — cross-engine behavior via the event bus, not imports.

### 6.1 Lesson structure

`LessonDefinition` (`composition/schema.ts`) is validated by the Zod `LessonSchema` and describes:

- `engines`: a list of `{ instanceId, engine, spec, view? }` — each a full engine spec embedded in the lesson;
- `bindings`: event routing rules such as *"when engine A emits `timeline.<evt>` (via `targetIdFrom`), dispatch `focus` to engine B's `targetId`".*

The reference composed lesson is `docs/fixtures/p7/composed-lesson.json` — a Timeline → Visual binding where selecting a timeline event routes a `focus` action to the corresponding visual entity (see `composition/router.ts`).

### 6.2 Runtime

`Lesson.load(input, registry)` validates the whole lesson, then `start(host)` instantiates every engine and installs the router. The resulting `LessonRuntime` exposes `instances` (a map of `EngineInstance`), plus `dispatch`, `snapshot`, `events`, and `stop`. Events across instances share one monotonic sequence, which is what makes the composed event log replayable as a whole.

### 6.3 The registry

An `EngineRegistry` maps `EngineType → Engine` and rejects duplicate registration (`INVALID_STATE`). `Lesson`, the React `InteractiveLesson`, and the conformance harness all build a registry and inject the engine implementations — the core is engine-agnostic by design.

## 7. Public API surface

The entire public surface of the core is centralized in `packages/interactive-engine/src/index.ts`:

- **Runtime**: `EngineRegistry`, `Engine`, `EngineInstance`, `EngineType`, `initialState`, `baseReducer`, `EventLog`, `createPlatformInstance`
- **Validation**: `runPipeline`, `validateEnvelope`, `ValidationResult`, `ValidationIssue`, `ValidationLevel`, `ValidationHooks`
- **Actions/events**: `EngineAction`, `EngineEvent`, `ACTION_TYPES`, `LIFECYCLE_EVENTS`, `EngineError`, `ERROR_CODES`, `ErrorCode`
- **Host**: `EngineHost`
- **Composition**: `Lesson`, `LessonRuntime`, `Router`, `LessonSchema`, `LessonDefinition`, `EngineEntry`, `Binding`, `BindingAction`
- **Accessibility**: `a11yTreeOf`, `A11yNode`

Engine internals stay unexported; the package boundary is the contract.

## 8. Packaging and integration topology

The family is published as seven `@knowledgeassemble/*` packages from `packages/`:

| Package | Role |
|---------|------|
| `interactive-engine` | core: contract, registry, reducer, event log, validation, composition |
| `visual-engine` | Visual engine (spatial/visual objects) |
| `geomap-engine` | GeoMap engine (geographic/where) |
| `chart-engine` | Chart engine (quantitative/how much) |
| `timeline-engine` | Timeline engine (temporal/when) |
| `diagram-engine` | Diagram engine (structural/how connected) |
| `interactive-react` | React mounts (`InteractiveNode`, `InteractiveLesson`) + `OpenEduBridge` adapter |

Packaging follows the STRUCTURE §40-41 rules: per-file `tsc` ESM emit into `dist/`, `prepublishOnly` runs build + typecheck + lint + test, and `publishConfig` points `main`/`types`/`exports` at `dist`. This preserves per-engine tree-shaking. Install, import public symbols, mount through `interactive-react`; the installed-package conformance is proven by `scripts/p7-publish-smoke.mjs` (packs, installs into a temp consumer, drives L1–L4 + a composed lesson from `dist`).

```
HOST (OpenEdu)
  │  installs @knowledgeassemble/*  (never vice-versa)
  ▼
interactive-react ── imports ──▶ interactive-engine (job of the engines)
      ▲                                ▲
      │ imports engines                │ core contract
      ▼                                │
visual · geomap · chart · timeline · diagram
```

## 9. Conformance and the harness

`apps/conformance` is a vanilla TypeScript Vite app that exposes `window.__harness` (`dispatch` / `snapshot` / `events` / `tryCreate`) and a `?engine=lesson` route that mounts the **real** `InteractiveLesson` via React, driving the composed lesson. Playwright e2e specs assert the exact event sequences (monotonic seq, ordered names), a11y output, and that malformed specs are rejected with shared codes. This is the in-repo proxy for OpenEdu's real `CourseRuntime` run (see `docs/p7-acceptance.md`).

## 10. Where to go next

- **Extend or author an engine** → [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) (contract walk-through, extension recipes, validation, packaging, tests).
- **Canonical design decisions** → [`DESIGN.md`](DESIGN.md) (P1–P12, D1–D9, ADR-01…09 in `docs/adr/`).
- **Shared contract details** (vocabulary, events, spec hierarchy, error codes) → [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md).
- **Repository layout and packaging rules** → [`STRUCTURE.md`](STRUCTURE.md).
- **Phase plan and status** → [`PLAN.md`](PLAN.md).
