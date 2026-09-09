# OpenEdu Interactive Engine
## Project Structure & Technology Stack Specification

**Status:** Proposed  
**Version:** 1.0  
**Organization:** KnowledgeAssemble  
**Project:** Interactive Engine  
**Primary Consumer:** OpenEdu  
**Repository:** `openedu-interactive`

---

# 1. Purpose

The OpenEdu Interactive Engine is a standalone, reusable interactive visualization and learning-runtime platform developed under the KnowledgeAssemble organization.

It provides a common runtime and a family of specialized rendering engines for educational interactive content.

The initial engine family consists of:

1. Visual Engine
2. GeoMap Engine
3. Chart Engine
4. Timeline Engine
5. Diagram Engine

The project SHALL remain independent from the OpenEdu application repository.

OpenEdu SHALL consume the Interactive Engine through published packages.

---

# 2. Architectural Principle

The project SHALL follow this principle:

> **The Interactive Engine is infrastructure; OpenEdu is a consumer.**

The Interactive Engine SHALL NOT contain OpenEdu-specific application logic.

It SHALL provide:

- declarative JSON specifications
- schema validation
- semantic scene, layout, and rendering
- D5 interaction reducer and serializable snapshot
- derived accessibility tree
- visualization primitives
- engine-specific rendering
- an `EngineHost` adapter (consume tokens/locale/assets; emit events)

OpenEdu SHALL provide:

- courses, lessons, workflow, mastery
- quiz scoring, rewards, Knowledge Cards
- authoring (Course Creator Studio, course-authoring skill)
- Pipili hints
- telemetry persistence
- design tokens, i18n, a11y preferences
- PWA, authentication, `.oep` storage and publishing
- widget catalog (until engines replace a given widget)

See DESIGN D6. Engines MUST NOT reimplement the OpenEdu column.

---

# 3. High-Level Architecture

```text
                         KnowledgeAssemble
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
           OpenEdu                    OpenEdu Interactive
              │                                   │
              │                           ┌───────┴────────┐
              │                           │                │
              │                         Runtime          Schemas
              │                           │
              │                    ┌──────┴──────┐
              │                    │             │
              │               Common APIs    Primitives
              │                    │
              │        ┌───────────┼───────────────┐
              │        │           │               │
              │        ▼           ▼               ▼
              │     Visual      GeoMap           Chart
              │
              │        ┌───────────┴───────────────┐
              │        ▼                           ▼
              │    Timeline                     Diagram
              │
              └──────────── consumes published packages
```

---

# 4. Repository Strategy

The Interactive Engine SHALL use a monorepo.

There SHALL be:

- one repository
- one shared development environment
- one shared CI pipeline
- one shared schema system
- one shared runtime
- multiple independently packaged engines

The project SHALL NOT use one repository per engine.

## Repository

```text
openedu-interactive
```

## Repository ownership

```text
KnowledgeAssemble
└── openedu-interactive
```

---

# 5. Monorepo Structure

The canonical project structure SHALL be:

```text
openedu-interactive/
│
├── packages/
│   │
│   ├── core/
│   │   ├── src/
│   │   │   ├── runtime/
│   │   │   ├── registry/
│   │   │   ├── state/
│   │   │   ├── events/
│   │   │   ├── interaction/
│   │   │   ├── animation/
│   │   │   ├── accessibility/
│   │   │   ├── responsive/
│   │   │   ├── theme/
│   │   │   ├── errors/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── schema/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── interaction/
│   │   │   ├── animation/
│   │   │   ├── accessibility/
│   │   │   ├── visual/
│   │   │   ├── geomap/
│   │   │   ├── chart/
│   │   │   ├── timeline/
│   │   │   ├── diagram/
│   │   │   └── index.ts
│   │   ├── json/
│   │   └── package.json
│   │
│   ├── primitives/
│   │   ├── src/
│   │   │   ├── scene/
│   │   │   ├── svg/
│   │   │   ├── layout/
│   │   │   ├── typography/
│   │   │   ├── interaction/
│   │   │   ├── tooltip/
│   │   │   ├── legend/
│   │   │   ├── labels/
│   │   │   ├── markers/
│   │   │   ├── connectors/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── react/
│   │   ├── src/
│   │   │   ├── InteractiveProvider.tsx
│   │   │   ├── InteractiveRenderer.tsx
│   │   │   ├── InteractiveBlock.tsx
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── visual/
│   │   ├── src/
│   │   │   ├── VisualEngine.tsx
│   │   │   ├── scene/
│   │   │   ├── components/
│   │   │   ├── interactions/
│   │   │   ├── animation/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── geomap/
│   │   ├── src/
│   │   │   ├── GeoMapEngine.tsx
│   │   │   ├── projection/
│   │   │   ├── layers/
│   │   │   ├── regions/
│   │   │   ├── markers/
│   │   │   ├── routes/
│   │   │   ├── labels/
│   │   │   ├── controls/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── chart/
│   │   ├── src/
│   │   │   ├── ChartEngine.tsx
│   │   │   ├── scales/
│   │   │   ├── coordinates/
│   │   │   ├── axes/
│   │   │   ├── series/
│   │   │   ├── annotations/
│   │   │   ├── interactions/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── timeline/
│   │   ├── src/
│   │   │   ├── TimelineEngine.tsx
│   │   │   ├── axis/
│   │   │   ├── periods/
│   │   │   ├── tracks/
│   │   │   ├── events/
│   │   │   ├── milestones/
│   │   │   ├── labels/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── diagram/
│       ├── src/
│       │   ├── DiagramEngine.tsx
│       │   ├── nodes/
│       │   ├── edges/
│       │   ├── layout/
│       │   ├── labels/
│       │   ├── interactions/
│       │   └── index.ts
│       └── package.json
│   │
│   └── dev-harness/
│       ├── src/                 stub host, mountEngine/mountLesson, loadSpec, harness API
│       ├── generated/           fixture catalog (build-fixture-catalog.mjs)
│       └── package.json
│
├── apps/
│   │
│   ├── conformance/
│   │   ├── src/                 Playwright e2e harness; engine routes delegate to dev-harness
│   │   └── package.json
│   │
│   ├── playground/
│   │   ├── src/                 React dev UI (port 5174)
│   │   └── package.json
│   │
│   ├── documentation/
│   │   ├── src/
│   │   └── package.json
│
├── examples/
│   ├── visual/
│   ├── geomap/
│   ├── chart/
│   ├── timeline/
│   └── diagram/
│
├── schemas/
│   ├── interactive.schema.json
│   ├── visual.schema.json
│   ├── geomap.schema.json
│   ├── chart.schema.json
│   ├── timeline.schema.json
│   └── diagram.schema.json
│
├── docs/
│   ├── architecture/
│   ├── engines/
│   ├── schemas/
│   ├── authoring/
│   └── development/
│
├── tests/
│   ├── integration/
│   ├── fixtures/
│   └── conformance/
│
├── scripts/
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

# 6. Package Architecture

The package dependency graph SHALL be:

```text
                         schema
                           │
                           ▼
                          core
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         primitives       react      animation
              │            │
      ┌───────┼───────┬────┼────┬──────────┐
      ▼       ▼       ▼    ▼    ▼
   visual  geomap   chart timeline diagram
```

Engines SHALL NOT depend on other engines.

For example:

```text
visual → chart        prohibited
chart → geomap       prohibited
geomap → timeline    prohibited
timeline → diagram  prohibited
```

All engines SHALL depend on shared platform packages where required.

---

# 7. Package Names

> **Note (superseded by DESIGN.md D2):** the package *separation* follows this structure; the namespace and exact package set follow DESIGN D2 and shared contract §90, and MUST adopt the host repository's convention (`@open-edu/*`) when integrated into the OpenEdu monorepo.

The initial public packages SHALL use the following naming convention:

```text
@knowledgeassemble/interactive-core
@knowledgeassemble/interactive-schema
@knowledgeassemble/interactive-primitives
@knowledgeassemble/interactive-react

@knowledgeassemble/interactive-visual
@knowledgeassemble/interactive-geomap
@knowledgeassemble/interactive-chart
@knowledgeassemble/interactive-timeline
@knowledgeassemble/interactive-diagram
```

A convenience package MAY later be introduced:

```text
@knowledgeassemble/interactive
```

This package SHALL provide a unified installation surface without changing the underlying package boundaries.

---

# 8. Technology Stack

## 8.1 Language

The project SHALL use:

```text
TypeScript
```

JavaScript-only packages SHALL NOT be introduced unless required by an external dependency.

Strict TypeScript mode SHALL be enabled.

---

# 9. UI Framework

The primary UI framework SHALL be:

```text
React
```

React SHALL be used for:

- lifecycle
- component composition
- application integration
- DOM rendering
- accessibility integration
- engine mounting

React SHALL NOT dictate the internal architecture of the rendering engines.

The core runtime SHALL remain as framework-independent as reasonably possible.

---

# 10. Build System

The project SHALL use:

```text
Vite
```

for applications and development tooling.

The monorepo SHALL use:

```text
pnpm workspaces
```

for package management.

Recommended structure:

```text
pnpm
  │
  ├── packages/*
  └── apps/*
```

Turborepo MAY be introduced if build/test orchestration becomes sufficiently large.

It SHALL NOT be required for the initial implementation.

---

# 11. Schema Technology

JSON SHALL be the canonical authoring representation.

The project SHALL use:

```text
JSON Schema
```

for external schemas.

TypeScript types SHALL be generated or derived from the schema definitions where practical.

Runtime validation SHALL use:

```text
Zod
```

The architecture SHALL maintain a clear distinction between:

```text
JSON Schema
    ↓
public contract

Zod
    ↓
runtime validation

TypeScript
    ↓
developer API
```

JSON SHALL remain the canonical interchange format.

---

# 12. Rendering Technology

The project SHALL support multiple rendering technologies.

The rendering technology SHALL be selected per engine.

## SVG

SVG SHALL be the primary rendering technology for:

- Visual Engine
- Diagram Engine
- Chart Engine
- initial GeoMap Engine

SVG is preferred because it provides:

- accessibility
- semantic structure
- DOM integration
- CSS styling
- pointer events
- inspectability
- scalable rendering

---

# 13. DOM

DOM rendering SHALL be used where content is:

- text-heavy
- accessibility-heavy
- card-oriented
- semantically structured

Timeline Engine SHALL primarily use:

```text
DOM + SVG
```

rather than forcing all content into SVG.

---

# 14. Canvas

Canvas MAY be used when:

- object count becomes large
- SVG performance becomes inadequate
- visualization requires high-frequency rendering
- particle/simulation effects are introduced

Canvas SHALL be an implementation detail.

The course JSON format SHALL NOT depend on Canvas.

---

# 15. WebGL

WebGL SHALL NOT be a first-class dependency of the initial platform.

It MAY be introduced later for:

- very large datasets
- advanced geographic rendering
- 3D visualizations
- simulations
- GPU-heavy interactions

The public Interactive Specification SHALL remain renderer-independent.

---

# 16. D3

D3 SHALL be used selectively.

Recommended uses:

```text
D3
├── scales
├── interpolation
├── data utilities
├── geo projections
├── geographic path generation
└── axis utilities where appropriate
```

D3 SHALL NOT become the architectural foundation of the entire Interactive Engine.

React and the OpenEdu scene/runtime model SHALL remain the primary architecture.

---

# 17. GeoMap Technology

The initial GeoMap Engine SHALL use:

```text
SVG
D3-geo
TopoJSON
```

Architecture:

```text
GeoMap Specification
        │
        ▼
GeoMap Runtime
        │
        ├── Projection
        ├── GeoJSON / TopoJSON
        ├── Regions
        ├── Markers
        ├── Routes
        └── Labels
                │
                ▼
              SVG
```

A WebGL/map-rendering backend MAY be introduced later.

MapLibre or another map engine SHALL NOT be a mandatory dependency of the initial version.

---

# 18. Chart Technology

Chart Engine SHALL use:

```text
React
SVG
D3 scales/utilities
```

The internal architecture SHALL distinguish:

```text
Data
  ↓
Scales
  ↓
Coordinate System
  ↓
Series
  ↓
Annotations
  ↓
Interaction
  ↓
Renderer
```

Initial supported chart families SHOULD include:

```text
bar
line
area
scatter
pie
```

Additional chart types SHALL be added through the same extensible series architecture.

---

# 19. Timeline Technology

Timeline Engine SHALL use:

```text
React
DOM
SVG
CSS
```

The engine SHALL support:

- events
- periods
- tracks
- milestones
- labels
- expandable details
- zooming
- scrolling
- selection
- keyboard navigation

The timeline SHALL remain suitable for long-form educational content.

---

# 20. Diagram Technology

Diagram Engine SHALL use:

```text
React
SVG
DOM
```

Automatic layout SHALL be abstracted behind an internal layout interface.

Example:

```ts
interface LayoutEngine {
  layout(
    graph: DiagramGraph,
    options: LayoutOptions
  ): LayoutResult;
}
```

Possible implementations:

```text
ELK
Dagre
manual layout
radial layout
tree layout
```

The JSON specification SHALL NOT expose library-specific layout configuration.

---

# 21. Visual Engine Technology

Visual Engine SHALL be SVG-first.

It SHALL provide a general-purpose interactive scene system supporting:

- shapes
- paths
- groups
- images
- text
- labels
- hotspots
- selection
- dragging
- transformation
- highlighting
- annotation
- animation

The Visual Engine SHALL serve as the most general-purpose engine in the initial family.

---

# 22. Shared Scene Model

The platform SHALL define a shared conceptual scene model.

```text
Scene
│
├── viewport
├── layers
│
└── elements
    ├── group
    ├── shape
    ├── path
    ├── text
    ├── image
    └── connector
```

The scene model SHALL be internal to the runtime unless explicitly exposed through a stable public API.

Engine specifications SHALL be normalized into runtime-friendly representations before rendering.

---

# 23. Interactive Runtime

The core runtime SHALL provide:

```text
InteractiveRuntime
├── specification loading
├── schema validation
├── normalization
├── engine resolution
├── state
├── events
├── interaction execution
├── animation
├── accessibility
├── responsive behavior
└── lifecycle
```

The runtime SHALL NOT contain engine-specific rendering logic.

---

# 24. Engine Registry

Engines SHALL register through a common registry.

Conceptually:

```ts
registerEngine({
  type: "visual",
  version: "1.0",
  renderer: VisualEngine
});
```

Additional engines SHALL be discoverable through the registry.

The renderer SHALL resolve an engine using:

```text
interactive.type
        ↓
Engine Registry
        ↓
Engine
        ↓
Renderer
```

This SHALL eliminate application-level conditionals such as:

```ts
if (type === "chart") ...
else if (type === "visual") ...
```

---

# 25. Interaction System

Interaction in specifications SHALL be declarative and semantic (DESIGN D5).

Specifications SHALL describe:

```text
semantic trigger (action or condition)
target
action
```

Example:

```json
{
  "trigger": "select",
  "target": "mars",
  "actions": [
    {
      "type": "select",
      "target": "mars"
    },
    {
      "type": "open-annotation",
      "target": "mars-fact"
    }
  ]
}
```

The runtime SHALL execute these actions.

The renderer MAY map `click` / pointer / keyboard to `select`. That mapping is an implementation detail. Specifications MUST NOT embed `click`, `pointer.*`, or arbitrary JavaScript.

---

# 26. Renderer Input vs Semantic Events

The renderer SHOULD listen for host-level input such as:

```text
pointer.enter
pointer.leave
pointer.down
pointer.up
click
doubleClick
keyboard
drag.start
drag
drag.end
```

These MUST be translated into D5 semantic actions (`select`, `focus`, `drag`, `drop`, …) before they enter the engine reducer.

Semantic events emitted on the bus are D5 lifecycle and `<engine>.<entity>-<result>` names (DESIGN §7.4). They are not pointer events.

Engine-specific **namespaced** actions MAY be introduced (`geomap.focus-place`) while preserving this split.

---

# 27. State Model

Interactive state SHALL be separated from course/application state.

The common runtime state SHOULD include:

```text
InteractiveState
├── selection
├── focus
├── hover
├── visibility
├── values
├── variables
├── animation
└── interactionHistory
```

Learning progress SHALL remain owned by the consuming learning application.

The Interactive Engine MAY expose interaction events that OpenEdu can convert into learning progress.

---

# 28. Animation

Animation SHALL be declarative.

The platform SHALL support:

```text
enter
exit
transition
emphasis
sequence
```

The implementation MAY use:

```text
Web Animations API
CSS transitions
CSS animations
requestAnimationFrame
```

Animation implementation SHALL remain independent of the public JSON contract.

---

# 29. Accessibility

Accessibility SHALL be a core platform capability, not an engine-specific afterthought.

The runtime SHALL support:

- keyboard navigation
- focus management
- semantic labels
- ARIA
- reduced motion
- screen-reader descriptions
- high-contrast compatibility
- accessible interaction alternatives

Interactive content SHALL remain usable without pointer-only interaction where technically feasible.

---

# 30. Responsive Architecture

Interactive blocks SHALL support:

```text
responsive sizing
aspect-ratio
viewport changes
container resizing
orientation changes
```

The runtime SHALL use:

```text
ResizeObserver
```

where appropriate.

Specifications SHALL describe intent rather than fixed browser dimensions.

---

# 31. Theme System

The platform SHALL provide a shared theme/token system.

Themes SHOULD control:

```text
typography
spacing
radius
stroke
surface
foreground
interaction states
motion
```

Engine implementations SHALL consume shared tokens rather than hard-coded application colors.

OpenEdu SHALL be able to provide its own theme.

---

# 32. Educational Semantics

The Interactive Engine MAY include an optional educational metadata layer.

Example:

```json
{
  "education": {
    "purpose": "compare",
    "learningObjective": "Compare the relative sizes of the regions",
    "interactionMode": "guided-exploration"
  }
}
```

Supported purposes MAY include:

```text
illustrate
explore
compare
classify
sequence
predict
manipulate
practice
assess
simulate
```

Educational semantics SHALL remain metadata and SHALL NOT tightly couple the runtime to OpenEdu's course model.

---

# 33. Data Architecture

Interactive data SHALL generally remain external to the renderer.

Conceptually:

```text
Specification
      │
      ├── visual configuration
      ├── interaction configuration
      └── data reference
                    │
                    ▼
                 Dataset
                    │
                    ▼
                Renderer
```

The platform SHOULD support:

```text
inline data
embedded data
course-relative assets
external data adapters
```

External network fetching SHALL NOT be mandatory for the core runtime.

---

# 34. Asset Handling

Interactive Engine SHALL support references to:

```text
SVG
PNG
JPEG
WebP
fonts
GeoJSON
TopoJSON
data files
```

The engine SHALL not own course asset storage.

The consuming application SHALL resolve asset URLs/references.

---

# 35. Development Applications

The project SHALL contain dedicated applications.

## Shared harness

```text
packages/dev-harness
```

`@knowledgeassemble/dev-harness` is a **private** workspace package (not published). It holds shared mount logic — stub `EngineHost`, fixture catalog, `loadSpec`, `mountEngine`, `mountLesson`, `exposeHarness` — used by both conformance and playground so manual and automated testing stay aligned. Engine packages SHALL NOT import `dev-harness`.

## Conformance

```text
apps/conformance
```

The conformance app is the Playwright e2e target (port 5173). It exposes `window.__harness` and routes by `?engine=`; per-engine routes delegate to `dev-harness`. The `?engine=core` route exercises the core platform instance only; `?engine=lesson` and `?engine=composition` mount composed lessons via React.

## Playground

Used for:

- rapid experimentation
- engine development
- interactive debugging
- schema testing
- examples

```text
apps/playground
```

The playground (port 5174, `pnpm playground`) is a React dev UI for manual verification. It loads the same fixture catalog as conformance and mounts through `dev-harness`. It implements a **stub** `EngineHost`. It is not the learner app.

## Documentation

Used for:

- API documentation
- schema documentation
- engine guides
- examples
- interactive demos

```text
apps/documentation
```

## Studio

There SHALL NOT be a product Interactive Studio (DESIGN D6).

Authoring of engine specifications belongs in **OpenEdu Course Creator Studio** (`apps/dev-server` in the OpenEdu monorepo) and the `openedu-course-authoring` skill.

A local preview in `apps/playground` MAY inspect specs. It SHALL NOT become a second course authoring shell.

---

# 36. Testing Strategy

Testing SHALL occur at multiple levels.

## Unit tests

```text
Vitest
```

Used for:

- schemas
- state
- events
- utilities
- scales
- layouts
- transformations

## Component tests

Used for:

- engine components
- primitives
- interaction behavior

## Integration tests

Used for:

```text
JSON
 ↓
validation
 ↓
runtime
 ↓
engine
 ↓
render
```

## Browser tests

```text
Playwright
```

Runs against `apps/conformance` (port 5173). Used for:

- keyboard navigation
- pointer interaction
- responsive behavior
- visual interaction
- accessibility
- cross-engine rendering

Manual verification uses `apps/playground` (port 5174); see `docs/DEVELOPER-GUIDE.md` §9.

---

# 37. Conformance Testing

Every engine SHALL pass a common conformance suite.

Example:

```text
Engine Conformance
├── initialization
├── validation
├── rendering
├── resize
├── keyboard
├── pointer interaction
├── accessibility
├── reduced motion
├── state updates
└── disposal
```

This prevents individual engines from developing incompatible runtime behavior.

---

# 38. Versioning

The project SHALL use semantic versioning.

Example:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Schema versions SHALL be explicitly represented.

Example:

```json
{
  "type": "chart",
  "version": "1.0"
}
```

Breaking schema changes SHALL require a new major schema version.

---

# 39. Backward Compatibility

Published interactive course content SHALL remain renderable across compatible runtime versions.

The runtime SHOULD provide migration/normalization layers:

```text
Old Spec
   ↓
Migration
   ↓
Canonical Spec
   ↓
Runtime
```

The rendering implementation SHALL be allowed to change without requiring course authors to rewrite content.

---

# 40. Performance Principles

The platform SHALL prioritize:

1. fast initial rendering
2. responsive interaction
3. low memory usage
4. progressive loading
5. minimal bundle size
6. engine-level code splitting

Engines SHALL be independently tree-shakeable.

An OpenEdu course containing only charts SHOULD NOT require the full GeoMap and Diagram implementations.

---

# 41. Code Splitting

The React integration SHOULD support lazy engine loading.

Conceptually:

```text
InteractiveRenderer
        │
        ▼
Engine Registry
        │
        ├── Visual → lazy
        ├── GeoMap → lazy
        ├── Chart → lazy
        ├── Timeline → lazy
        └── Diagram → lazy
```

This is especially important for the OpenEdu Learner application.

---

# 42. Security

Interactive specifications SHALL be treated as untrusted data.

The runtime SHALL NOT execute arbitrary JavaScript from course packages.

The platform SHALL protect against:

- script injection
- unsafe HTML
- unsafe SVG
- malicious URLs
- resource abuse
- unbounded rendering

SVG sanitization SHALL be applied wherever user/generated SVG content enters the runtime.

---

# 43. AI Generation Compatibility

The architecture SHALL be optimized for AI-generated interactive specifications.

The AI-facing contract SHALL be:

```text
JSON Schema
        ↓
AI generates JSON
        ↓
Schema validation
        ↓
Normalization
        ↓
Runtime
        ↓
Renderer
```

AI agents SHALL NOT be required to generate React components.

AI agents SHALL NOT directly manipulate engine internals for ordinary content generation.

This is a core architectural goal.

---

# 44. OpenEdu Integration

OpenEdu SHALL consume the engine through packages.

Example:

```text
OpenEdu Course
       │
       ▼
Interactive Block
       │
       ▼
@knowledgeassemble/interactive-react
       │
       ├── interactive-core
       ├── interactive-schema
       └── engine packages
```

OpenEdu SHALL remain responsible for:

```text
course lifecycle
lesson lifecycle
workflow / mastery
quiz scoring / rewards
Pipili
telemetry persistence
authoring (Course Creator Studio)
publishing / .oep / storage
theme tokens / i18n / a11y prefs
```

Interactive Engine SHALL remain responsible for:

```text
spec validation
semantic scene / layout / SVG
D5 actions + snapshot
derived accessibility tree
visualization
onEvent → host
```

---

# 45. Dependency Boundary

The following dependency SHALL be allowed:

```text
OpenEdu
   ↓
Interactive Engine
```

The following SHALL be prohibited:

```text
Interactive Engine
   ↓
OpenEdu
```

Interactive Engine packages SHALL NOT import:

```text
OpenEdu course runtime
OpenEdu learner state
OpenEdu Studio
OpenEdu authentication
OpenEdu database
OpenEdu-specific UI
```

This boundary SHALL be enforced during code review.

---

# 46. SVG Generator Relationship

The SVG Generator SHALL remain a separate KnowledgeAssemble project.

```text
KnowledgeAssemble
│
├── OpenEdu
│
├── OpenEdu Interactive
│
└── SVG Generator
```

The relationship SHALL be:

```text
SVG Generator
      │
      │ generates assets
      ▼
Course / Interactive Asset
      │
      ▼
Interactive Engine
      │
      │ renders/interacts
      ▼
Learner
```

The SVG Generator SHALL NOT be embedded into the Interactive Engine core.

---

# 47. Initial Technology Matrix

| Area | Technology |
|---|---|
| Language | TypeScript |
| UI | React |
| Build | Vite |
| Package manager | pnpm |
| Schema | JSON Schema |
| Runtime validation | Zod |
| Rendering | SVG / DOM |
| High-performance rendering | Canvas, optional |
| GPU rendering | WebGL, future |
| Visualization utilities | D3 |
| Geo data | GeoJSON / TopoJSON |
| Geo projections | D3-geo |
| Diagram layout | ELK / Dagre adapter |
| Animation | Web Animations API / CSS |
| Testing | Vitest |
| Browser testing | Playwright |
| Documentation | TBD, preferably VitePress or equivalent |
| CI | GitHub Actions |
| Package registry | npm |
| Versioning | SemVer |

---

# 48. Explicit Non-Goals

The initial Interactive Engine SHALL NOT attempt to become:

- a general GIS platform
- a general-purpose charting replacement for every use case
- a 3D graphics engine
- a full animation editor
- a generic game engine
- an LMS
- a course authoring platform (OpenEdu Course Creator Studio already exists)
- a second telemetry, i18n, or design-token product
- an LMS assessment engine
- Pipili / AI companion
- a database
- a cloud rendering service
- an AI agent framework

The engine should remain focused on:

> **Declarative, accessible, educational interactive visualization.**

---

# 49. Initial Implementation Priority

Implementation SHOULD proceed in the following order:

```text
Phase 1
│
├── Schema
├── Core runtime
├── Engine registry
├── State
├── Events
├── Interaction DSL
├── Accessibility
└── Shared primitives

Phase 2
│
└── Visual Engine

Phase 3
│
└── Chart Engine

Phase 4
│
└── GeoMap Engine

Phase 5
│
└── Timeline Engine

Phase 6
│
└── Diagram Engine
```

The first goal SHALL be establishing the platform contract rather than maximizing the number of visualization types.

---

# 50. Architectural North Star

The final architecture should be understood as:

```text
                  INTERACTIVE JSON
                         │
                         ▼
                 ┌───────────────┐
                 │    Schema     │
                 │   Validation  │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    Runtime    │
                 │               │
                 │ State         │
                 │ Events        │
                 │ Interaction   │
                 │ Animation     │
                 │ Accessibility │
                 └───────┬───────┘
                         │
                  Engine Registry
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       Visual          Chart          GeoMap
          │              │              │
          └──────────────┼──────────────┘
                         │
                   Timeline / Diagram
                         │
                         ▼
                    Scene Model
                         │
                         ▼
                 DOM / SVG / Canvas
                         │
                         ▼
                      Learner
```

The fundamental architectural rule is:

> **Course authors and AI agents describe what an interactive should mean. The Interactive Engine decides how it is rendered and how it behaves.**

This separation allows OpenEdu to evolve independently while the Interactive Engine becomes reusable infrastructure across KnowledgeAssemble products.

---

# 51. Definition of Done

The project structure and technology architecture SHALL be considered established when:

- the standalone repository exists under KnowledgeAssemble
- pnpm workspace is configured
- TypeScript strict mode is enabled
- schema package exists
- core runtime exists
- engine registry exists
- React integration exists
- shared primitives exist
- Visual Engine renders a valid JSON specification
- Chart Engine renders a valid JSON specification
- GeoMap Engine renders a valid JSON specification
- Timeline Engine renders a valid JSON specification
- Diagram Engine renders a valid JSON specification
- all engines pass the common conformance suite
- packages can be independently published
- OpenEdu can consume the published packages
- no Interactive Engine package depends on OpenEdu
- interactive specifications contain no arbitrary executable JavaScript
- accessibility and responsive behavior are part of the core runtime
- AI-generated JSON can be validated and rendered without custom code generation

---

# 52. Final Architectural Decision

**Repository:** Separate KnowledgeAssemble repository.

**Repository model:** Monorepo.

**Package model:** Multiple independently consumable npm packages.

**Runtime:** Shared.

**Schema:** JSON Schema + Zod runtime validation.

**Rendering:** SVG/DOM first; Canvas/WebGL optional.

**Framework:** React integration with framework-independent core concepts.

**Engines:** Visual, GeoMap, Chart, Timeline, Diagram.

**OpenEdu relationship:** Consumer, not owner.

**SVG Generator relationship:** Separate sibling project.

**Primary design principle:**

> **One Interactive Runtime. Multiple Specialized Engines. One Declarative JSON Contract.**