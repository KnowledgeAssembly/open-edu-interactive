# KnowledgeAssemble Visual Engine
## Architecture Specification

**Repository:** `knowledgeassemble/visual-engine`  
**Status:** Proposed Architecture  
**Version:** 0.1  
**Primary Runtime:** TypeScript / Node.js / Browser-compatible core  
**Initial Renderer:** SVG  
**Primary Consumer:** OpenEdu  
**Architecture Style:** Schema-first, compiler-oriented, library-first

---

# 1. Architectural Intent

KnowledgeAssemble Visual Engine is a reusable infrastructure project for generating **semantic, accessible, deterministic educational visuals**.

The architecture MUST separate:

1. **What the visual means**
2. **How the visual is structured**
3. **How the visual is laid out**
4. **How the visual is rendered**
5. **How the visual is validated**
6. **How an application interacts with the visual**

The fundamental pipeline is:

```text
                  Natural Language / Agent
                           │
                           ▼
                 Visual Specification
                           │
                           ▼
                    Schema Validator
                           │
                           ▼
                     Scene Builder
                           │
                           ▼
                     Layout Engine
                           │
                           ▼
                    Render Pipeline
                           │
                           ▼
                  ┌────────┴────────┐
                  ▼                 ▼
                 SVG             Metadata
                  │                 │
                  └────────┬────────┘
                           ▼
                    Validation / QA
                           │
                           ▼
                    Educational Asset
```

The architecture MUST preserve this separation.

---

# 2. Core Architectural Principle

## The Visual Specification is the Source of Truth

The system MUST treat structured visual specifications as canonical.

SVG is a compiled output.

Example:

```text
assets/
  flower.visual.json      ← source
  flower.svg              ← compiled artifact
```

The SVG MUST NOT be parsed back into the semantic source during normal operation.

A future renderer can consume the same specification:

```text
flower.visual.json
       │
       ├── SVG renderer
       ├── HTML renderer
       ├── Canvas renderer
       └── PDF renderer
```

---

# 3. Conceptual Layers

The system consists of eight logical layers.

```text
┌──────────────────────────────────────────┐
│ 8. Agent / Application Interface         │
├──────────────────────────────────────────┤
│ 7. Recipe / Component Composition        │
├──────────────────────────────────────────┤
│ 6. Validation & QA                       │
├──────────────────────────────────────────┤
│ 5. Renderer                              │
├──────────────────────────────────────────┤
│ 4. Layout Engine                         │
├──────────────────────────────────────────┤
│ 3. Semantic Scene Graph                  │
├──────────────────────────────────────────┤
│ 2. Visual Specification / Schema         │
├──────────────────────────────────────────┤
│ 1. Core Geometry & Primitives             │
└──────────────────────────────────────────┘
```

Dependencies flow downward.

Lower layers MUST NOT depend on higher layers.

---

# 4. Layer 1 — Core Geometry

The geometry layer provides mathematical and structural primitives.

Examples:

```text
Point
Size
Rect
Bounds
Vector
Transform
Angle
Path
Polygon
```

Example:

```ts
interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

This layer MUST be renderer-independent.

It MUST NOT know about:

- SVG
- React
- OpenEdu
- DOM
- browser events

---

# 5. Layer 2 — Visual Specification

The Visual Specification is the public declarative representation. It uses the shared envelope; visual kind and scene data live in `content`.

Example:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "content": {
    "kind": "number-line",
    "range": {
      "min": 0,
      "max": 10,
      "step": 1
    },
    "highlight": [7]
  }
}
```

The specification should describe:

- visual type
- semantic intent
- data
- components
- relationships
- accessibility
- interaction contracts
- theme
- localization

It SHOULD NOT directly prescribe renderer-specific coordinates unless explicitly required.

---

# 6. Schema Design

The schema should be versioned with the envelope `version` field (semver). `schemaVersion` is superseded (DESIGN D1).

```text
version: "1.0.0"
```

Schema evolution MUST be backward-conscious.

Breaking changes require a new schema version.

Example:

```text
1.0
1.1
1.2

2.0 ← breaking
```

The schema package owns:

```text
types
schemas
semantic roles
interaction contracts
accessibility structures
```

Recommended implementation:

```text
packages/schema/
├── src/
│   ├── visual.ts
│   ├── scene.ts
│   ├── interaction.ts
│   ├── accessibility.ts
│   └── roles.ts
├── schemas/
└── tests/
```

---

# 7. Layer 3 — Semantic Scene Graph

The Scene Graph is the intermediate representation between specification and rendering.

This is one of the most important architectural boundaries.

Example:

```text
Scene
│
├── Group: number-line
│   │
│   ├── Line
│   ├── Tick: 0
│   ├── Label: 0
│   ├── Tick: 1
│   ├── Label: 1
│   ├── ...
│   ├── Tick: 7
│   └── Label: 7
```

Each node has semantic identity.

Example:

```ts
interface SceneNode {
  id: string;
  role: SemanticRole;
  bounds?: Rect;
  children?: SceneNode[];
  metadata?: Record<string, unknown>;
}
```

The scene graph MAY contain renderer-neutral geometry after layout.

---

# 8. Why the Scene Graph Exists

Do not render directly from the input specification.

Instead:

```text
Specification
      ↓
Scene Graph
      ↓
Layout
      ↓
Renderer
```

This allows:

- multiple renderers
- inspection
- validation
- accessibility analysis
- interaction mapping
- visual debugging
- transformations
- animation later

Without a scene graph, these responsibilities become coupled to SVG.

---

# 9. Semantic Identity

Every meaningful node MUST have a stable ID.

Example:

```text
flower
flower-petal-01
flower-petal-02
flower-stigma
flower-anther
```

IDs MUST:

- be unique within the scene
- be deterministic where possible
- be stable across rendering
- avoid random UUIDs unless necessary

Stable IDs enable:

```text
interaction
analytics
accessibility
testing
animation
AI inspection
```

---

# 10. Semantic Roles

Roles describe what an object means.

Initial vocabulary:

```text
visual
group
label
diagram
diagram-part

number
number-line
tick
axis
marker

counting-object
fraction
fraction-part
shape
angle

timeline
timeline-event

option
answer
drop-target
hotspot
selectable
draggable
```

The role system MUST remain extensible.

Roles describe semantics, not visual appearance.

---

# 11. Layer 4 — Layout Engine

The layout engine converts semantic scene structures into concrete geometry.

Example:

```text
NumberLine
     ↓
semantic ticks
     ↓
layout algorithm
     ↓
x positions
     ↓
Scene nodes with bounds
```

The layout engine owns:

- positioning
- sizing
- alignment
- spacing
- wrapping
- label placement
- collision detection
- viewport calculation

It MUST NOT generate SVG.

---

# 12. Layout Strategies

Initial strategies:

```text
absolute
horizontal
vertical
grid
radial
stack
center
distributed
```

Components can declare layout requirements.

Example:

```ts
layout: {
  type: "horizontal",
  gap: 16
}
```

---

# 13. Coordinate System

The internal coordinate system SHOULD use a consistent Cartesian coordinate model.

Recommended:

```text
origin: top-left
x: right
y: down
```

The renderer is responsible for translating this to target-specific coordinate systems if required.

Geometry calculations MUST NOT depend on SVG coordinate quirks.

---

# 14. Bounding Boxes

Every layout-capable node SHOULD expose bounds after layout.

```ts
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Bounds are used for:

- collision detection
- label placement
- viewport calculation
- hit testing
- validation

---

# 15. Label Placement

Labels require a dedicated layout subsystem.

It SHOULD support:

```text
above
below
left
right
inside
outside
leader-line
auto
```

Example:

```text
     Leaf
       │
       ▼
      /\
     /  \
    /    \
```

The layout system SHOULD attempt to resolve collisions automatically.

If automatic placement fails, validation SHOULD report a warning or error.

---

# 16. Collision Detection

MVP collision detection MAY begin with axis-aligned bounding boxes.

Later versions MAY support:

- polygon collision
- path collision
- text measurement
- leader-line routing

The collision subsystem MUST remain renderer-independent as far as practical.

---

# 17. Layer 5 — Renderer

The renderer converts the laid-out scene graph into an output format.

Initial implementation:

```text
SVGRenderer
```

Interface:

```ts
interface Renderer<TOutput> {
  render(scene: Scene): TOutput;
}
```

Future:

```ts
SvgRenderer
CanvasRenderer
HtmlRenderer
PdfRenderer
```

The core system MUST NOT assume SVG is the only renderer.

---

# 18. SVG Renderer Responsibilities

The SVG renderer owns:

- XML generation
- SVG namespace
- `viewBox`
- SVG groups
- SVG primitives
- SVG text
- SVG attributes
- SVG accessibility markup
- SVG-specific optimization

It MUST NOT determine educational semantics.

---

# 19. SVG Structure

Generated SVG SHOULD have a predictable structure.

Example:

```xml
<svg>
  <title>...</title>
  <desc>...</desc>

  <g id="visual-root">
    <g id="number-line" data-oedu-role="number-line">
      ...
    </g>
  </g>
</svg>
```

Semantic IDs MUST survive rendering.

---

# 20. Semantic Metadata in SVG

Semantic information MAY be encoded using:

```text
id
data-oedu-role
data-oedu-value
data-oedu-group
```

Example:

```xml
<g
  id="number-7"
  data-oedu-role="number"
  data-oedu-value="7">
</g>
```

The exact metadata namespace SHOULD eventually become a documented stable contract.

---

# 21. Accessibility Architecture

Accessibility information originates in the Visual Specification and flows through the Scene Graph into the renderer.

```text
Accessibility Spec
       ↓
Scene semantics
       ↓
SVG accessibility
```

The renderer MUST support:

```text
title
description
accessible name
semantic grouping
interactive labels
```

The engine SHOULD avoid blindly applying ARIA roles where native semantics are sufficient.

---

# 22. Interaction Architecture

Interaction is represented declaratively.

Example:

```json
{
  "id": "number-7",
  "interaction": {
    "click": {
      "action": "select"
    }
  }
}
```

The Visual Engine MUST NOT contain:

```ts
onClick={() => ...}
```

or application-specific callbacks.

Instead:

```text
Visual Engine
     ↓
Interaction Contract
     ↓
Consumer application
     ↓
Actual behavior
```

---

# 23. Interaction Contract

Example:

```ts
interface InteractionContract {
  click?: Action;
  hover?: Action;
  focus?: Action;
  drag?: DragContract;
  drop?: DropContract;
}
```

Actions should be semantic:

```text
select
highlight
show-explanation
reveal-answer
mark-correct
mark-incorrect
navigate
toggle
```

The action vocabulary SHOULD be extensible.

---

# 24. Application Independence

The engine MUST NOT depend on:

- React
- Vue
- Svelte
- OpenEdu
- browser state
- application routing
- analytics providers

The consuming application interprets interaction contracts.

---

# 25. Layer 6 — Validation

Validation operates at multiple levels.

```text
Input validation
       ↓
Scene validation
       ↓
Layout validation
       ↓
SVG validation
       ↓
Accessibility validation
```

Validators SHOULD produce structured results.

```ts
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
```

---

# 26. Validation Categories

Initial categories:

```text
SCHEMA
SEMANTICS
GEOMETRY
LAYOUT
ACCESSIBILITY
SVG
SECURITY
COMPLEXITY
```

Example:

```json
{
  "code": "LABEL_OVERLAP",
  "severity": "warning",
  "objects": [
    "leaf-label",
    "stem-label"
  ]
}
```

---

# 27. Validation Must Be Composable

Validators SHOULD implement a common interface:

```ts
interface Validator {
  validate(context: ValidationContext): ValidationResult;
}
```

This allows:

```text
SchemaValidator
SemanticValidator
LayoutValidator
AccessibilityValidator
SvgValidator
SecurityValidator
```

without creating one giant validator.

---

# 28. Layer 7 — Components

Educational components are reusable semantic building blocks.

A component is NOT simply an SVG template.

Example:

```text
fraction-bar
```

represents the concept of a fraction bar.

It can then be rendered as SVG.

Component interface:

```ts
interface VisualComponent<TProps> {
  type: string;
  create(props: TProps): SceneNode;
}
```

---

# 29. Component Architecture

Recommended:

```text
packages/components/src/
├── math/
│   ├── number-line/
│   ├── counting-set/
│   ├── fraction-bar/
│   ├── fraction-circle/
│   ├── clock/
│   ├── coordinate-grid/
│   └── geometry-shape/
│
├── science/
│
├── language/
│
└── general/
    ├── timeline/
    ├── flowchart/
    ├── comparison/
    └── label-diagram/
```

Components should compose smaller primitives and components.

---

# 30. Component Contract

Every component SHOULD define:

```text
type
props schema
semantic roles
scene generation
layout requirements
accessibility defaults
interaction capabilities
theme requirements
tests
examples
```

Example:

```text
FractionBar
 ├── Props
 ├── Schema
 ├── Scene generator
 ├── Layout
 ├── Accessibility
 ├── Interaction
 ├── Tests
 └── Example
```

---

# 31. Composition

Components MUST be composable.

Example:

```text
Comparison
├── FractionBar(1/2)
├── FractionBar(3/4)
└── Labels
```

The engine should not require bespoke implementations for every combination.

---

# 32. Recipes

Recipes sit above components.

```text
Primitive
   ↓
Component
   ↓
Recipe
   ↓
Educational Visual
```

Example:

```text
fraction-comparison
```

may compose:

```text
fraction-bar
fraction-label
comparison-arrow
answer-marker
```

Recipes should remain declarative.

---

# 33. Layer 8 — Agent Interface

AI agents should primarily interact with:

```text
components
recipes
visual specifications
validation
inspection
preview
```

not low-level SVG.

Recommended agent workflow:

```text
1. Understand lesson requirement
2. Search existing visual assets
3. Select component/recipe
4. Create Visual Specification
5. Validate schema
6. Generate scene
7. Render
8. Validate
9. Preview
10. Iterate
11. Save source + artifact
```

---

# 34. Agent Inspection

The engine SHOULD expose scene inspection.

Example:

```json
{
  "objects": [
    {
      "id": "leaf",
      "role": "diagram-part",
      "bounds": {
        "x": 100,
        "y": 80,
        "width": 60,
        "height": 40
      }
    }
  ]
}
```

This allows agents to reason about generated visuals without parsing raw SVG.

---

# 35. Preview Architecture

Preview generation should be separate from SVG rendering.

```text
Scene
  ↓
SVG Renderer
  ↓
SVG
  ↓
Preview Renderer
  ↓
PNG/WebP
```

Preview generation MUST NOT alter the canonical SVG.

---

# 36. Theme Architecture

Themes provide visual tokens.

```ts
interface VisualTheme {
  colors: ...;
  typography: ...;
  spacing: ...;
  strokes: ...;
  shapes: ...;
}
```

Components consume semantic tokens.

Bad:

```ts
fill: "#ff0000"
```

Preferred:

```ts
fill: theme.colors.accent.primary
```

Themes MUST NOT modify educational semantics.

---

# 37. Responsive Rendering

The semantic specification SHOULD remain independent of target size.

Example:

```text
same visual
     ↓
320 × 240
768 × 512
1200 × 800
```

The layout engine determines geometry based on viewport constraints.

The MVP MAY support a fixed viewport.

Responsive behavior should be architecturally possible without redesigning the schema.

---

# 38. Localization Architecture

Localized content SHOULD be represented separately from geometry.

Example:

```json
{
  "label": {
    "key": "flower.petals"
  }
}
```

The rendering context provides:

```ts
{
  locale: "hi"
}
```

Text measurement must occur after localization.

This is essential because:

```text
English label width
≠
Hindi label width
≠
Odia label width
```

---

# 39. Asset Architecture

Generated assets should be treated as build artifacts.

Recommended:

```text
visual/
  lesson-01/
    flower.visual.json
    flower.svg
    flower.preview.png
```

The canonical file is:

```text
flower.visual.json
```

Generated files MAY be regenerated.

---

# 40. Versioning

Assets SHOULD record:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01"
}
```

Implementation/engine versions belong to package metadata, not the specification envelope.

This enables deterministic regeneration and migration.

---

# 41. Package Architecture

Recommended package graph:

```text
@knowledgeassemble/visual-schema
            │
            ▼
@knowledgeassemble/visual-core
            │
      ┌─────┼─────┐
      ▼     ▼     ▼
   layout components themes
      │     │     │
      └─────┼─────┘
            ▼
@knowledgeassemble/visual-renderer-svg
            │
            ▼
@knowledgeassemble/visual-validator
```

The dependency graph MUST remain acyclic.

---

# 42. Proposed Repository Structure

```text
visual-engine/
│
├── packages/
│   │
│   ├── schema/
│   │   ├── src/
│   │   ├── schemas/
│   │   └── tests/
│   │
│   ├── core/
│   │   ├── src/
│   │   │   ├── geometry/
│   │   │   ├── scene/
│   │   │   └── transforms/
│   │   └── tests/
│   │
│   ├── layout/
│   │   ├── src/
│   │   │   ├── strategies/
│   │   │   ├── labels/
│   │   │   └── collision/
│   │   └── tests/
│   │
│   ├── components/
│   │   ├── src/
│   │   │   ├── math/
│   │   │   ├── science/
│   │   │   ├── language/
│   │   │   └── general/
│   │   └── tests/
│   │
│   ├── themes/
│   │   ├── src/
│   │   └── themes/
│   │
│   ├── renderer-svg/
│   │   ├── src/
│   │   └── tests/
│   │
│   └── validator/
│       ├── src/
│       │   ├── schema/
│       │   ├── geometry/
│       │   ├── accessibility/
│       │   ├── svg/
│       │   └── security/
│       └── tests/
│
├── apps/
│   ├── playground/
│   └── api/
│
├── cli/
│
├── recipes/
│
├── skills/
│   └── educational-visual/
│
├── examples/
│
├── tests/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│
├── ARCHITECTURE.md
├── PROJECT-SPEC.md
├── README.md
└── package.json
```

---

# 43. API Boundary

The core library API should look conceptually like:

```ts
const visual = parseVisual(spec);

const scene = buildScene(visual);

const laidOut = layout(scene, context);

const result = renderSvg(laidOut);

const validation = validate({
  visual,
  scene: laidOut,
  output: result
});
```

The exact API can evolve.

The architectural sequence MUST remain.

---

# 44. Service Architecture

The hosted API is optional and should be thin.

```text
HTTP API
   │
   ▼
Application Adapter
   │
   ▼
Core Visual Engine
```

Do NOT implement:

```text
HTTP API
   ├── custom schema logic
   ├── custom renderer
   ├── custom validation
   └── duplicated component system
```

The service should call the same libraries used by the CLI and local consumers.

---

# 45. AI Generation Architecture

AI-assisted generation belongs outside the deterministic renderer.

Recommended:

```text
                  AI Agent
                     │
                     ▼
             Natural Language
                     │
                     ▼
             AI Visual Planner
                     │
                     ▼
           Visual Specification
                     │
                     ▼
             Deterministic Engine
```

The AI planner MAY be implemented later.

The core engine MUST work without an LLM.

---

# 46. Asset Discovery

A future asset registry can expose:

```text
search
get
inspect
reuse
instantiate
```

The search system should index:

```text
component type
semantic roles
subject
grade level
language
tags
interaction capabilities
```

This allows agents to reuse visuals.

---

# 47. Security Boundary

SVG is potentially executable content.

The SVG renderer MUST NOT emit:

```text
<script>
event handler attributes
javascript:
unsafe external resources
```

Unless a future security-reviewed architecture explicitly supports them.

Generated SVG MUST be safe for browser rendering.

External images MUST be controlled and validated.

---

# 48. Determinism

Determinism is a core invariant.

For:

```text
same specification
+
same engine version
+
same theme
+
same locale
+
same rendering context
```

the output SHOULD be byte-stable where practical.

Avoid:

```text
Math.random()
timestamps
unordered object serialization
non-deterministic layout
```

unless explicitly required.

---

# 49. Error Handling

Errors should be typed.

Example:

```ts
class VisualSchemaError {}
class VisualLayoutError {}
class VisualRenderError {}
class VisualValidationError {}
```

Errors MUST provide machine-readable codes.

Example:

```text
VISUAL_INVALID_SCHEMA
VISUAL_UNKNOWN_COMPONENT
VISUAL_LAYOUT_OVERFLOW
VISUAL_LABEL_COLLISION
VISUAL_ACCESSIBILITY_MISSING_NAME
```

---

# 50. Observability

The core library should remain lightweight.

Optional instrumentation hooks MAY expose:

```text
generation time
layout time
render time
node count
validation time
```

The core MUST NOT require a telemetry service.

---

# 51. Performance Model

Optimize first for correctness.

The expected workload is:

```text
small → medium educational diagrams
```

rather than:

```text
large CAD drawings
complex illustrations
3D scenes
```

Initial performance priorities:

1. deterministic output
2. correctness
3. accessibility
4. predictable memory usage
5. reasonable rendering speed

---

# 52. Testing Architecture

Tests should exist at each boundary.

```text
Schema tests
     ↓
Core tests
     ↓
Layout tests
     ↓
Component tests
     ↓
Renderer tests
     ↓
Validator tests
     ↓
Integration tests
     ↓
Visual regression tests
```

A component should not be considered production-ready without tests across the relevant boundaries.

---

# 53. Golden Fixtures

Maintain representative fixtures:

```text
fixtures/
  number-line/
  fraction-bar/
  clock/
  flower/
  timeline/
```

Each fixture SHOULD include:

```text
input.visual.json
output.svg
validation.json
preview.png
```

This makes regressions easy to detect.

---

# 54. Architectural Invariants

The following rules are NON-NEGOTIABLE.

### Invariant 1

Core packages MUST NOT depend on OpenEdu.

### Invariant 2

Core packages MUST NOT depend on React.

### Invariant 3

Semantic specification MUST NOT depend on SVG.

### Invariant 4

Educational components MUST NOT directly emit application event handlers.

### Invariant 5

SVG MUST be a rendered artifact, not the canonical source.

### Invariant 6

LLMs MUST NOT be required for deterministic rendering.

### Invariant 7

Accessibility MUST be represented in the semantic pipeline.

### Invariant 8

Every meaningful object MUST have semantic identity.

### Invariant 9

Validation MUST be machine-readable.

### Invariant 10

The hosted API MUST reuse the same core libraries as local execution.

---

# 55. Dependency Direction

Allowed:

```text
schema
  ↑
core
  ↑
layout
  ↑
components
  ↑
renderer
```

More precisely, the preferred graph is:

```text
schema
   │
   ▼
core
   │
   ├───────────────┐
   ▼               ▼
layout          components
   │               │
   └───────┬───────┘
           ▼
      renderer-svg
           │
           ▼
       validator
```

The exact dependency arrangement MAY change if it preserves the architectural invariants.

---

# 56. What Must NOT Happen

Agents MUST NOT create an architecture like:

```text
React app
   ↓
SVG helper
   ↓
OpenEdu-specific code
   ↓
hard-coded SVG templates
```

Nor:

```text
LLM
 ↓
raw SVG
 ↓
browser
```

Nor:

```text
OpenEdu
 ↓
Visual Engine
 ↓
OpenEdu imports
```

Nor:

```text
API
 ├── duplicate renderer
 ├── duplicate schema
 └── duplicate components
```

---

# 57. Evolution Path

The architecture should evolve through these stages.

## Stage 1

```text
Visual Spec
   ↓
SVG
```

with minimal scene graph.

## Stage 2

```text
Visual Spec
   ↓
Scene Graph
   ↓
Layout
   ↓
SVG
```

## Stage 3

```text
Visual Spec
   ↓
Scene Graph
   ↓
Layout
   ├── SVG
   ├── Canvas
   └── HTML
```

## Stage 4

```text
Visual Spec
   ↓
Semantic Scene
   ↓
Interaction Runtime
   ↓
Interactive Visual
```

## Stage 5

```text
Educational Intent
       ↓
AI Planner
       ↓
Visual Specification
       ↓
Visual Engine
       ↓
Multi-target Visual
```

---

# 58. Relationship With OpenEdu

OpenEdu should integrate at the boundary.

```text
┌─────────────────────┐
│ OpenEdu             │
│                     │
│ Course / Lesson     │
│ Activity            │
│ Interaction Runtime │
└──────────┬──────────┘
           │
           │ Visual Specification
           ▼
┌─────────────────────┐
│ KnowledgeAssemble   │
│ Visual Engine       │
└─────────────────────┘
```

OpenEdu owns:

- lesson meaning
- curriculum
- learner state
- activity state
- scoring
- application behavior

Visual Engine owns:

- visual semantics
- geometry
- layout
- rendering
- visual accessibility
- visual validation

---

# 59. OpenEdu Integration Contract

OpenEdu should be able to store a visual reference such as:

```json
{
  "type": "visual",
  "asset": "flower.visual.json",
  "renderer": "svg",
  "interaction": {
    "mode": "hotspot"
  }
}
```

The exact OpenEdu lesson schema belongs to OpenEdu.

The Visual Engine MUST NOT import or depend on it.

---

# 60. Long-Term KnowledgeAssemble Position

The Visual Engine should eventually become a general-purpose **semantic visual infrastructure layer** within the KnowledgeAssemble ecosystem.

Potential consumers:

```text
OpenEdu
     │
Knowledge tools
     │
Documentation systems
     │
Educational publishers
     │
Research visualizations
     │
Accessibility tools
```

OpenEdu is the first consumer, not the architectural owner.

---

# 61. Initial Vertical Slice

Implementation MUST begin with one complete vertical path:

```text
number-line.visual.json
          ↓
schema validation
          ↓
scene construction
          ↓
layout
          ↓
SVG rendering
          ↓
accessibility validation
          ↓
SVG output
```

Do not build ten components before proving this architecture.

The vertical slice MUST demonstrate:

- semantic IDs
- deterministic geometry
- layout
- SVG rendering
- accessibility
- validation
- test fixtures
- CLI execution

---

# 62. Architecture Decision Records

Significant architectural decisions MUST be recorded under:

```text
docs/adr/
```

Initial ADRs:

```text
ADR-001-library-first-architecture.md
ADR-002-visual-specification-as-source-of-truth.md
ADR-003-semantic-scene-graph.md
ADR-004-svg-as-first-renderer.md
ADR-005-deterministic-rendering.md
ADR-006-agent-first-interface.md
ADR-007-interaction-contracts.md
ADR-008-accessibility-by-default.md
```

Agents SHOULD create an ADR before introducing a decision that materially changes the architecture.

---

# 63. Architecture Success Criteria

The architecture is successful if an AI agent can request:

> Create an interactive visual comparing 1/2 and 3/4.

and the system can produce:

```text
comparison.visual.json
        ↓
semantic scene
        ↓
layout
        ↓
accessible SVG
        ↓
validation report
```

without:

- manually authored SVG
- OpenEdu-specific code
- React dependencies
- non-deterministic geometry
- renderer-specific semantic logic

The resulting visual should be usable by OpenEdu while remaining independently useful to other KnowledgeAssemble projects.

---

# 64. Final Architectural Principle

The project should always preserve this mental model:

```text
                EDUCATIONAL INTENT
                        │
                        ▼
              VISUAL SPECIFICATION
                        │
                        ▼
                SEMANTIC SCENE
                        │
                        ▼
                   LAYOUT
                        │
                        ▼
                   RENDERER
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
            SVG       Canvas      HTML
             │
             ▼
        VALIDATION
             │
             ▼
       EDUCATIONAL ASSET
```

**AI decides what should be represented.**

**The Visual Engine decides how that representation becomes a correct visual.**

**The consuming application decides what happens when the learner interacts with it.**

That separation is the central architectural contract of KnowledgeAssemble Visual Engine.