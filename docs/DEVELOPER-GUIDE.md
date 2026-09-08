# OpenEdu Interactive Engine — Developer Guide

A practical guide for two audiences:

1. **Integrators** — teams hosting these engines: wiring the host seam, mounting nodes and lessons, consuming events, adopting the schema, authoring specs.
2. **Extenders** — engine authors: implementing the `Engine` contract, adding validation hooks, rendering, packaging, and testing a new engine.

This is the "how-to" counterpart to the architecture and contract. For the model, see [`ARCHITECTURE.md`](ARCHITECTURE.md); for the canonical decisions and contract, [`DESIGN.md`](DESIGN.md) and [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md); for repo layout and packaging rules, [`STRUCTURE.md`](STRUCTURE.md).

---

## 1. Orientation

### 1.1 Repo map

```text
packages/interactive-engine/   core: engine, registry, state, action, event, host,
                               validation/ (L1–L4), runtime/ (reducer, event-log, instance),
                               accessibility/, composition/, schemas/
packages/{visual,geomap,chart,timeline,diagram}-engine/   the five engines
packages/interactive-react/    React mounts + OpenEduBridge adapter
apps/conformance/              vanilla-TS Vite app exposing window.__harness for Playwright
docs/                          ARCHITECTURE, DESIGN, INTERACTIVE-ENGINE-SPEC, STRUCTURE,
                               PLAN, schemas/, fixtures/, engines/,
                               adr/ (ADR-01…09)
```

### 1.2 The core loop

```text
spec (JSON) ──▶ Engine.validate  (L1–L4) ──▶ EngineInstance (dispatch ─▶ events/snapshot)
                                                                      ▲
lesson (composed) ──▶ Lesson.load ── start(host) ── mounts each instance + router
```

- Engine authors implement `validate` + `instantiate`.
- Hosts build an `EngineHost` (or `OpenEduBridge`), `dispatch` semantic actions, and consume `events`/`snapshot`.
- Composers (authors) write lesson JSON that binds engines together.

### 1.3 Conventions that will bite you if ignored

- **ESM** — local imports must use `.js` specifiers (`import { x } from './core/action.js'`). Extensionless relative imports fail typecheck (TS2835). This is enforced by `module: "NodeNext"` and is the permanent convention (publishing is per-file `tsc` ESM emit).
- **Strict TS** — `noUncheckedIndexedAccess` is on; `arr[i]` is `T | undefined`. Assert deliberately with `!`.
- **Closed action enum (D5)** — dispatch uses the semantic `ACTION_TYPES`. Renderer input (`click`, `pointer.*`, `keyboard`) must **never** appear in specs; translate at the renderer boundary.
- **No arbitrary JS (P10)** — no inline scripts, no `javascript:` URIs, no event handlers in specs.
- **Shared errors** — raise the common `ERROR_CODES` (`INVALID_SPEC`, `INVALID_ACTION`, `INVALID_REFERENCE`, `UNSUPPORTED_ACTION`, …), never bespoke codes.
- **Deterministic (P4)** — no randomness in layout, styling, or selection. Golden event logs are asserted byte-for-byte.
- **Engine isolation (D2)** — engines never import each other or any `@open-edu/*` package.

---

## 2. Hosting an engine (Integrators)

### 2.1 Install the packages

```sh
pnpm add @knowledgeassemble/interactive-engine \
  @knowledgeassemble/visual-engine @knowledgeassemble/timeline-engine \
  @knowledgeassemble/interactive-react
```

Add whichever engines you need. `interactive-react` is optional — it's the React convenience layer over the raw core.

### 2.2 Implement the host seam

Raw (non-React) hosts implement `EngineHost`:

```ts
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
```

```ts
const host: EngineHost = {
  locale: 'en',
  tokens: { emphasis: '#b00', focus: { /* … */ } }, // semantic tokens, never literal color
  reducedMotion: false,
  announce(message: string) { liveRegion.textContent = message; },
  onEvent(event) { telemetry.push(event); },          // D5 event stream
  resolveAsset(id) { return assetStore.get(id); },    // .oep resources
};
```

React hosts implement `OpenEduBridge` (note the client-shaped `onEvent` and an i18n `t()`):

```tsx
import type { OpenEduBridge } from '@knowledgeassemble/interactive-react';

const bridge: OpenEduBridge = {
  locale: 'en',
  tokens: designTokens,
  reducedMotion: false,
  t: (key, vars) => i18n.format(key, vars),   // your i18n, NOT hard-coded strings
  announce: (msg) => announceLive(msg),
  onEvent: (event) => telemetry.send(event),
  resolveAsset: (id) => assetResolver.load(id),
};
```

The bridge is passed **into** the engine via `bridgeToHost`. The direction of dependency is one-way — the engine never imports your code (D6).

### 2.3 Mount a single interactive node

`InteractiveNode` mounts one engine spec for a given `engineType` (it registers all five engines internally). A `forwardRef` handle exposes `dispatch` / `snapshot` / `events`:

```tsx
import { createElement, createRef } from 'react';
import { InteractiveNode } from '@knowledgeassemble/interactive-react';
import type { InteractiveNodeHandle } from '@knowledgeassemble/interactive-react';

const nodeRef = createRef<InteractiveNodeHandle>();
const el = createElement(InteractiveNode, {
  spec: visualSpec,      // the engine spec JSON
  engineType: 'visual',  // 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram'
  host: bridge,
  id: 'demo',
  ref: nodeRef,
});

// later:
nodeRef.current?.dispatch({ type: 'focus', target: { id: 'marker-7' } });
nodeRef.current?.snapshot();
nodeRef.current?.events();   // real events, not a stub
```

### 2.4 Mount a composed lesson

`InteractiveLesson` registers all five engines, validates, and mounts every instance + the router. A `forwardRef` handle exposes the runtime:

```tsx
import { createElement, createRef } from 'react';
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';
import type { InteractiveLessonHandle } from '@knowledgeassemble/interactive-react';

const handle = createRef<InteractiveLessonHandle>();
const el = createElement(InteractiveLesson, { lesson, host: bridge, ref: handle });

// later:
handle.current?.dispatch('timeline-1', { type: 'select', target: { id: 'event-2' } });
const snapshot = handle.current?.snapshot('visual-1');
const events = handle.current?.events();       // monotonic-seq, replayable
```

### 2.5 Drive it

All interaction is **dispatching semantic actions** and **consuming events/snapshots**:

```ts
instance.dispatch({ type: 'focus', target: { id: 'marker-7' } });
instance.dispatch({ type: 'play-pause' });
instance.dispatch({ type: 'answer', payload: { value: '42' } }); // payload is engine-specific
```

Consume the emitted event sequence (`seq` monotonic across all instances in a lesson) for telemetry, scoring, workflow — all OpenEdu-side concerns (D6/D7). Never reach in and mutate state.

### 2.6 Validate an authored spec

Use the engine (or `runPipeline`) directly to give authors precise errors:

```ts
const engine = new VisualEngine();
const result = engine.validate(spec);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.code}] at ${issue.path}: ${issue.message}`);
  }
}
```

Malformed specs raise `EngineError` with a shared `code` (e.g. `INVALID_SPEC`, `INVALID_REFERENCE`). Authoring skills live under `docs/engines/*/skills/` and are the in-repo evidence that AI agents can produce valid specs.

### 2.7 Adopt the lesson-node schema

The proposal schema for `@open-edu/schemas` is `docs/schemas/interactive-lesson-node.schema.json`. It prescribes the `{ type:"interactive", engine, spec }` node form plus the composed-lesson form, with `additionalProperties:false`. Keep that strictness when adopting (see `docs/p7-acceptance.md`).

---

## 3. Extending — writing a new engine (Extenders)

### 3.1 The `Engine` contract

Everything an engine must provide (from the core `packages/interactive-engine/src/core/engine.ts`):

```ts
interface Engine {
  readonly type: EngineType;               // must be a known EngineType
  validate(spec: EngineSpec): ValidationResult;
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
```

The `EngineInstance` you return must expose `id`, `engine`, `dispatch`, `snapshot`, `subscribe`, `teardown`. You may obtain this from the core (`createPlatformInstance`) or build a richer one — the Visual engine builds a richer one to expose its deterministic `scene`/`svgResult` in the snapshot.

### 3.2 Skeleton of a new engine

Model new engines on `packages/visual-engine/src/engine.ts`. A minimal shape:

```ts
import {
  EngineError, initialState, baseReducer, EventLog, runPipeline,
  type Engine, type EngineInstance, type EngineType, type EngineSpec,
  type EngineHost, type ValidationResult, type EngineAction,
} from '@knowledgeassemble/interactive-engine';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import type { MySpec } from './schema.js';

export class MyEngine implements Engine {
  readonly type: EngineType = 'visual';  // your EngineType

  validate(spec: EngineSpec): ValidationResult {
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as MySpec),
      layout: (s) => validateLayout(s as unknown as MySpec),
      accessibility: (s) => validateAccessibility(s as unknown as MySpec),
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const v = this.validate(spec);
    if (!v.valid) {
      throw new EngineError('INVALID_SPEC',
        `validation failed: ${v.issues.map(i => i.message).join('; ')}`);
    }
    // deterministic setup: build your model (scene/geometry/data), render once
    const instanceId = id ?? spec.id;
    let state = { ...initialState(instanceId, this.type), phase: 'running' };
    const log = new EventLog();
    const listeners = new Set<(e: Parameters<EngineHost['onEvent']>[0]) => void>();
    const emit = (e: Parameters<EngineHost['onEvent']>[0]) => {
      host.onEvent(e);
      for (const l of listeners) l(e);
    };
    emit(log.append('engine-mounted', instanceId));
    emit(log.append('engine-ready', instanceId));

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction) {
        state = baseReducer(state, action);            // closed semantic actions
        emit(log.append('interaction-started', instanceId, undefined, action));
        emit(log.append('state-changed', instanceId, undefined, action));
        // emit a namespaced result event, e.g. `${this.type}.${target}-selected`
        emit(log.append('interaction-completed', instanceId, undefined, action));
      },
      snapshot() { return { ...state, /* your model */ }; },
      subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
      teardown() { listeners.clear(); state = { ...state, phase: 'torn-down' }; },
    };
  }
}
```

### 3.3 Structure your engine (recommended layering)

Follow the Visual engine's decomposition:

```text
src/
  schema.ts            TypeScript types for your spec (mirrors the JSON Schema)
  schemas/             JSON Schema for L1 + your L2–L4 additions
  engine.ts            the Engine class
  validation/
    semantic.ts        L2 — references resolve, kinds valid, no contradictions
    layout.ts          L3 — geometry/placement coherent, deterministic
    accessibility.ts   L4 — roles/labels/keyboard path present
  scene/               build your semantic model (e.g. visual scene graph)
  layout/              deterministic placement
  render/              produce renderable output (e.g. SVG) + result types
  index.ts             export the Engine class + public types only
```

### 3.4 Validation hooks (L2–L4)

- **L2 Semantic** is where most authoring errors live: entity references must resolve, `kind`s must be valid, provenance (`authoritative`/`illustrative`/`simulated`) classes must be present for factual claims, values must be in range.
- **L3 Layout** enforces deterministic geometry — no un-pinned positions, no ambiguous layout.
- **L4 Accessibility** enforces that every interactive entity has a `role`, a non-empty `label`, and a keyboard path; nothing is conveyed by color alone.

Each returns a `ValidationResult` (`{ valid, issues: [{ level, code, message, path }] }`). Use `INVALID_REFERENCE` for dangling refs, `INVALID_SPEC` for shape/domain violations, `INVALID_ENTITY` for missing/unknown entities.

### 3.5 Rendering

Rendering is **deterministic and computed once** (or on discrete state changes), never per-frame from live pointer state. The Visual engine builds `scene → layout → SVG` in `instantiate` and exposes the result on `snapshot().svgResult`. Renderers must never embed author-controlled inline scripts or `javascript:` URIs (P10).

### 3.6 Register and test in conformance

1. Add your engine package under `packages/<name>-engine/`.
2. Register it in the `InteractiveLesson` registry (and the conformance harness) so compositions and e2e can use it.
3. Add open `type` to the shared enums only as a **deliberate, documented contract change** (`EngineType`, `ACTION_TYPES`, and the engine schema's `type`/`class` enums must stay in sync — see the parity guardrail below).

### 3.7 Action/content additions are contract changes

Any addition to `ACTION_TYPES`, `EngineType`, or the shared envelope schema is a **contract change** that must be:

1. Namespaced and documented in the engine spec,
2. Reflected in `packages/interactive-engine/src/schemas/actions.ts`, the engine schema, and the runtime Zod `LessonSchema`,
3. Kept in parity across the copied schema copies (`docs/schemas/` vs `packages/*/src/schemas/`),
4. Deliberate — this is the vendor-facing surface OpenEdu builds against.

---

## 4. Semantic actions cheat-sheet

From `packages/interactive-engine/src/schemas/actions.ts`:

| Action | Purpose (semantic) |
|--------|--------------------|
| `select` / `deselect` | toggle selection membership |
| `focus` / `unfocus` | move focus to/from an entity |
| `filter` / `clear-filter` | set/clear a filter set |
| `open-annotation` / `close-annotation` | reveal/hide annotation |
| `toggle` / `expand` / `collapse` | disclosure/expansion |
| `play-pause` / `step` / `scrub` | playback + stepping |
| `zoom` / `pan` | viewport navigation (semantic) |
| `answer` / `compare` | assessment input (OpenEdu scores it) |
| `drag` / `drop` / `place` / `move` / `connect` / `disconnect` / `follow` | manipulation |
| `reset` | restore initial state |

Superseded/banned names (`highlight`, `annotate`, `blur`, `play`, `show`) and renderer input (`click`, `pointer.*`, `keyboard`) **cannot** appear in specs.

---

## 5. Composition — binding engines

A lesson routes events between instances. From `docs/fixtures/p7/composed-lesson.json`:

```json
{
  "engines": [
    { "instanceId": "timeline-1", "engine": "timeline", "spec": { "type": "timeline", "…": "…" } },
    { "instanceId": "visual-1", "engine": "visual", "spec": { "type": "visual", "…": "…" } }
  ],
  "bindings": [
    {
      "on": "timeline.event-selected",      // namespaced event to listen for
      "from": "timeline-1",                 // source instance
      "dispatch": {
        "to": "visual-1",                   // target instance
        "action": "focus",
        "targetIdFrom": "links.visualEntityId" // dynamic: read from the source event data
      }
    }
  ]
}
```

A binding's `dispatch` must define **exactly one** of `targetIdFrom` (dynamic — a path read from the source event) or `targetId` (static). The `Router` matches the emitted namespaced event on the source instance and dispatches the mapped action to the target instance, preserving a single monotonic `seq` across the whole lesson.

---

## 6. Packaging and publishing

Packaging rules (STRUCTURE §40-41) are already wired into all seven packages; keep them intact:

- Per-file `tsc` ESM emit into `dist/` (there is **no bundler**); local imports use `.js` specifiers.
- `prepublishOnly` = `build && typecheck && lint && test`.
- `publishConfig.main`/`types`/`exports` point at `dist`; `files` ships `["src","dist"]`.
- `tsconfig.build.json` sets `noEmit:false`, `outDir:dist`, `declaration:true`, `include:["src"]`.

Validate before publishing:

```sh
pnpm publish:dry     # pnpm -r publish --dry-run (no registry push)
pnpm publish:smoke   # scripts/p7-publish-smoke.mjs: pack → install into temp consumer →
                     #   import public symbols → tsc --noEmit → drive L1–L4 + a composed lesson from dist
```

The smoke script is the in-repo proof that the installed package works, not just the workspace path.

---

## 7. Testing

- **Unit (Vitest)** — `packages/*/test/**/*.test.ts`. Cover the lifecycle (monotonic seq, ordered names), validation negatives (each `ErrorCode`), determinism (two runs identical), and schema/Zod parity. Write the test **first** (test-driven; a feature is "done" only when a red test turns green).
- **Golden fixtures** — checked in; expected event sequences asserted exactly. If a renderer/layout change alters output, update fixtures via a **reviewed** change.
- **Schema/parity** — keep the Zod `LessonSchema`, JSON Schema copies, and the closed enums in sync. There is a dedicated parity guardrail (`packages/interactive-engine/test/schema-parity.test.ts`) — run it whenever you touch a schema.
- **Browser e2e (Playwright)** — against `apps/conformance` (`window.__harness`, `?engine=lesson` mounts the real `InteractiveLesson`). Deterministic only — no flaky timers/layout-order dependence (non-parallel here).
- **Installed-package** — `pnpm publish:smoke` (see §6).

Run the full gate from the repo root:

```sh
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

---

## 8. Checklist before you call an engine done

- [ ] Implements `Engine` (`type`, `validate`, `instantiate`) and returns a conformant `EngineInstance`.
- [ ] L2–L4 validation hooks real, returning shared `ErrorCode`s with precise `path`s.
- [ ] Deterministic: identical input → identical output, no randomness.
- [ ] Accessible: roles, non-empty labels, keyboard paths; nothing color-only.
- [ ] No inline scripts / `javascript:` URIs / author-supplied handlers in output.
- [ ] Renders once (or on discrete state change) — no `pointer.*` in specs.
- [ ] Provenance (`source.class`) on any factual/geographic/historical claim.
- [ ] Tests written first; golden event log byte-stable; schema parity green.
- [ ] `EngineType`/`ACTION_TYPES`/schema enum changes are documented, deliberate contract changes.
- [ ] `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright` green; `pnpm publish:dry` + `publish:smoke` green for packaging changes.
- [ ] Public API centralized in the package `index.ts`; internals unexported.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `TS2835` on a relative import | Missing `.js` specifier. Use `./core/action.js` (NodeNext). |
| `arr[i]` is `T \| undefined` | `noUncheckedIndexedAccess` — assert with `!` deliberately. |
| `UNSUPPORTED_ACTION` at dispatch | Action not in the closed semantic enum (D5). Re-map renderer input at the boundary. |
| Extensionless import fails build | Same as TS2835 — NodeNext requires the explicit `.js`. |
| Unknown key silently accepted | A schema copy drifted or `additionalProperties` is not `false`. Run the parity guardrail; fix the **higher** doc/schema. |
| Golden log differs | Non-deterministic render or layout. No randomness (P4). |
| Engine can't see another engine | Correct — engines are isolated (D2). Compose via the event bus in a lesson. |
| `INVALID_REFERENCE` | A spec references an entity id that isn't declared. |
| Package won't resolve installed | Check `publishConfig` points at `dist` and `prepublishOnly` built it; run `pnpm publish:smoke`. |

---

## 10. Where the source of truth lives

When docs disagree with code, fix the **higher** document, never the implementation. Reading order: `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → engine `SPEC.md`/`VISION.md` → (Visual only) `ARCHITECTURE.md`. This guide is a how-to layer on top of those; if it ever conflicts with them, the higher docs win.
