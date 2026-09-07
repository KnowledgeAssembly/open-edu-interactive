# KnowledgeAssemble Visual Engine
# Component Specification

**Status:** Proposed  
**Version:** 1.0  
**Schema Version:** `visual-component/v1`  
**Parent Specification:** `SPEC.md`

> **Normative scope (DESIGN D9).** MVP Visual components are the seven math kinds plus `comparison` only. Sections describing `timeline`, `flowchart`, and `label-diagram` are **historical reference** for widget migration — implement those patterns in Timeline or Diagram engines, not Visual.

---

## 1. Purpose

The KnowledgeAssemble Visual Engine uses **components** to represent reusable semantic visual patterns.

A component is a higher-level visual abstraction that can be:

- understood by AI agents
- described semantically
- configured through structured props
- laid out declaratively
- rendered to SVG, HTML, Canvas, or other supported targets
- made accessible
- localized
- made responsive
- reused across educational domains

Components are **not SVG templates**.

A component defines **what a visual represents**, not how its SVG is constructed.

For example:

```json
{
  "id": "line-1",
  "type": "number-line",
  "props": {
    "min": 0,
    "max": 10,
    "step": 1,
    "highlight": [3, 7]
  }
}
```

The component renderer decides how the number line is represented visually.

The Visual Specification remains the canonical source.

---

# 2. Design Principles

Components MUST follow these principles.

## 2.1 Semantic First

Components describe educational meaning.

Good:

```json
{
  "type": "fraction-bar",
  "props": {
    "numerator": 3,
    "denominator": 4
  }
}
```

Bad:

```json
{
  "type": "svg",
  "props": {
    "path": "M12 30..."
  }
}
```

---

## 2.2 Renderer Independent

Component definitions MUST NOT depend on:

- SVG
- React
- DOM
- CSS
- Canvas APIs
- browser events
- framework-specific components

The same component specification should be renderable by different engines.

---

## 2.3 AI-Agent Friendly

Components should expose:

- human-readable names
- descriptions
- typed props
- valid ranges
- defaults
- examples
- constraints
- accessibility requirements
- localization requirements
- capabilities

An AI agent should be able to construct a valid component without knowing implementation details.

---

## 2.4 Educational Meaning

Components should represent common educational concepts rather than generic graphics.

Examples:

- number line
- fraction bar
- clock
- coordinate grid
- geometric shape
- timeline
- process diagram
- labeled diagram
- comparison diagram

---

## 2.5 Composable

Components may contain other components.

For example:

```text
coordinate-grid
 ├── axis
 ├── tick labels
 ├── plotted point
 └── annotation
```

or:

```text
label-diagram
 ├── central illustration
 ├── labels
 └── relationships
```

---

# 3. Component Architecture

The component pipeline is:

```text
Component Specification
        │
        ▼
Component Registry
        │
        ▼
Prop Validation
        │
        ▼
Semantic Expansion
        │
        ▼
Primitive / Child Elements
        │
        ▼
Layout Resolution
        │
        ▼
Renderer
        │
        ├── SVG
        ├── HTML
        ├── Canvas
        └── Other
```

The component itself MUST NOT directly emit serialized SVG.

---

# 4. Component Definition

Every registered component MUST have a definition.

Conceptually:

```json
{
  "id": "number-line",
  "version": "1.0.0",
  "category": "mathematics",
  "name": "Number Line",
  "description": "Represents ordered numerical values along a line.",
  "props": {},
  "capabilities": {},
  "accessibility": {},
  "layout": {},
  "examples": []
}
```

---

# 5. Component Identity

## 5.1 `id`

Unique stable component identifier.

Format:

```text
namespace.component-name
```

Examples:

```text
core.group
math.number-line
math.fraction-bar
math.coordinate-grid
math.geometry-shape
science.label-diagram
science.water-cycle
general.timeline
```

Built-in components SHOULD use namespace-specific identifiers.

---

## 5.2 `version`

Semantic version:

```text
MAJOR.MINOR.PATCH
```

Example:

```json
{
  "version": "1.2.0"
}
```

Breaking changes require a major version increment.

---

# 6. Component Categories

Initial categories:

```text
core
mathematics
science
language
social-science
timeline
diagram
accessibility
general
```

The registry MAY add additional categories.

---

# 7. Component Capabilities

Every component declares its capabilities.

```json
{
  "capabilities": {
    "interactive": true,
    "localizable": true,
    "responsive": true,
    "accessible": true,
    "printable": true,
    "scalable": true
  }
}
```

## Supported capabilities

| Capability | Meaning |
|---|---|
| `interactive` | Component supports semantic interaction |
| `localizable` | Text can be localized |
| `responsive` | Component can adapt to available space |
| `accessible` | Component has accessibility representation |
| `printable` | Component can render appropriately for print |
| `scalable` | Component scales without semantic degradation |
| `composable` | Component may contain children |
| `dataDriven` | Component can consume structured data |

---

# 8. Component Props

Props are the primary configuration mechanism.

Example:

```json
{
  "type": "math.number-line",
  "props": {
    "min": 0,
    "max": 20,
    "step": 1,
    "showLabels": true
  }
}
```

Props MUST be:

- JSON serializable
- schema validated
- deterministic
- semantic
- renderer independent

Props MUST NOT contain:

```text
SVG paths
DOM nodes
CSS strings
JavaScript functions
event handlers
HTML
serialized markup
```

---

# 9. Prop Types

Supported primitive types:

```text
string
number
integer
boolean
array
object
enum
reference
```

Example:

```json
{
  "step": {
    "type": "number",
    "minimum": 0.0001,
    "default": 1
  }
}
```

---

# 10. Prop Definition

A prop definition SHOULD include:

```json
{
  "type": "number",
  "description": "Distance between major ticks.",
  "default": 1,
  "minimum": 0.0001,
  "maximum": 100,
  "required": false
}
```

Supported metadata:

```text
type
description
required
default
minimum
maximum
minimumItems
maximumItems
enum
items
properties
reference
```

---

# 11. Semantic References

Props may reference other visual entities.

Example:

```json
{
  "target": {
    "type": "reference",
    "referenceType": "element"
  }
}
```

Reference values:

```json
{
  "target": "point-a"
}
```

References MUST resolve during validation.

Broken references are validation errors.

---

# 12. Component Instance

A component instance in a Visual Specification has this structure:

```json
{
  "id": "fraction-1",
  "type": "math.fraction-bar",
  "props": {
    "numerator": 3,
    "denominator": 4
  },
  "layout": {
    "mode": "center"
  },
  "style": {
    "accent": "accent.primary"
  },
  "accessibility": {
    "label": "Three quarters"
  }
}
```

Supported fields:

```text
id
type
props
layout
style
accessibility
interaction
visibility
constraints
children
extensions
```

---

# 13. Component Lifecycle

A component follows these conceptual stages:

```text
Input
 ↓
Validate Props
 ↓
Normalize Props
 ↓
Resolve References
 ↓
Calculate Semantic Model
 ↓
Generate Child Elements
 ↓
Apply Layout
 ↓
Apply Theme
 ↓
Accessibility Resolution
 ↓
Renderer
```

Components MUST behave deterministically.

---

# 14. Component Registry

The engine maintains a registry.

Example:

```typescript
interface ComponentRegistry {
  register(component: ComponentDefinition): void;
  get(id: string): ComponentDefinition | undefined;
  has(id: string): boolean;
  list(): ComponentDefinition[];
}
```

The registry is responsible for:

- component discovery
- version resolution
- prop schemas
- capability metadata
- documentation
- validation
- renderer availability

---

# 15. Component Definition Schema

Conceptual TypeScript:

```typescript
interface ComponentDefinition {
  id: string;
  version: string;

  category: string;

  name: string;
  description: string;

  props: Record<string, PropDefinition>;

  capabilities: ComponentCapabilities;

  accessibility?: AccessibilityContract;

  layout?: LayoutContract;

  constraints?: ComponentConstraints;

  examples?: ComponentExample[];

  renderers: RendererCapabilities;
}
```

---

# 16. Component Constraints

Components may declare semantic constraints.

Example:

```json
{
  "constraints": {
    "minimumWidth": 240,
    "minimumHeight": 80,
    "preserveAspectRatio": true,
    "minimumTextSize": 14
  }
}
```

Constraints SHOULD be expressed semantically wherever possible.

Prefer:

```json
{
  "minimumTouchTarget": 44
}
```

over:

```json
{
  "buttonWidth": 44,
  "buttonHeight": 44
}
```

---

# 17. Layout Contract

Components may specify preferred layout behavior.

```json
{
  "layout": {
    "preferredModes": [
      "horizontal",
      "vertical"
    ],
    "supportsResize": true,
    "preserveAspectRatio": true
  }
}
```

The component MUST NOT assume a fixed canvas size.

---

# 18. Accessibility Contract

Components MUST declare accessibility requirements.

Example:

```json
{
  "accessibility": {
    "requiredName": true,
    "requiredDescription": false,
    "supportsReadingOrder": true,
    "supportsAlternativeRepresentation": true
  }
}
```

Interactive components MUST provide an accessible name.

---

# 19. Localization Contract

A localizable component declares which props can contain user-facing text.

Example:

```json
{
  "localization": {
    "textProps": [
      "title",
      "label",
      "description"
    ]
  }
}
```

Components MUST NOT construct localized strings by concatenating hard-coded text.

Bad:

```text
"3 out of " + denominator
```

Preferred:

```json
{
  "key": "fraction.description",
  "variables": {
    "numerator": 3,
    "denominator": 4
  }
}
```

---

# 20. Component Output Contract

A component expands into semantic Visual Specification elements.

Example:

```text
math.fraction-bar
       │
       ├── group
       ├── fraction-part
       ├── fraction-part
       ├── divider
       └── label
```

The expansion MUST preserve semantic meaning.

The renderer may then convert these elements into SVG.

---

# 21. Component Families

The initial component library should contain several families.

```text
Core
 ├── group
 ├── stack
 ├── row
 ├── grid
 └── legend

Mathematics
 ├── number-line
 ├── counting-set
 ├── fraction-bar
 ├── fraction-circle
 ├── coordinate-grid
 ├── geometry-shape
 ├── angle
 ├── equation
 └── measurement

Science
 ├── label-diagram
 ├── process-diagram
 ├── cycle
 ├── hierarchy
 └── system-diagram

General
 ├── timeline
 ├── comparison
 ├── flowchart
 └── sequence
```

---

# 22. Core Components

## 22.1 `core.group`

Groups related visual content.

Props:

```json
{
  "children": []
}
```

Purpose:

- semantic grouping
- accessibility grouping
- layout grouping

---

## 22.2 `core.row`

Places children horizontally.

```json
{
  "type": "core.row",
  "props": {
    "children": ["a", "b", "c"],
    "gap": "space.medium"
  }
}
```

---

## 22.3 `core.stack`

Places children vertically.

```json
{
  "type": "core.stack",
  "props": {
    "children": ["a", "b", "c"],
    "gap": "space.medium"
  }
}
```

---

## 22.4 `core.grid`

Structured two-dimensional layout.

Props:

```text
columns
rows
gap
children
```

---

# 23. Mathematics Components

## 23.1 `math.number-line`

Represents ordered numerical values.

Example:

```json
{
  "id": "number-line",
  "type": "math.number-line",
  "props": {
    "min": 0,
    "max": 10,
    "step": 1,
    "majorStep": 1,
    "showLabels": true,
    "points": [
      {
        "value": 3,
        "label": "A"
      }
    ]
  }
}
```

### Props

| Prop | Type | Required |
|---|---|---|
| `min` | number | yes |
| `max` | number | yes |
| `step` | number | yes |
| `majorStep` | number | no |
| `showLabels` | boolean | no |
| `points` | array | no |
| `rangeHighlight` | array | no |
| `direction` | enum | no |

### Direction

```text
horizontal
vertical
```

### Constraints

```text
max > min
step > 0
majorStep > 0
```

---

# 24. `math.counting-set`

Represents a collection of countable objects.

Example:

```json
{
  "type": "math.counting-set",
  "props": {
    "count": 8,
    "object": "circle",
    "arrangement": "grid"
  }
}
```

Props:

```text
count
object
arrangement
rows
columns
highlight
labels
```

The object type MUST be semantic.

Allowed examples:

```text
circle
square
star
apple
leaf
dot
custom-symbol
```

---

# 25. `math.fraction-bar`

Represents a fraction as partitioned whole.

Example:

```json
{
  "type": "math.fraction-bar",
  "props": {
    "numerator": 3,
    "denominator": 4,
    "orientation": "horizontal"
  }
}
```

Props:

```text
numerator
denominator
orientation
showFraction
showLabels
highlightedParts
```

Constraints:

```text
denominator > 0
0 <= numerator <= denominator
```

For improper fractions, the component MAY support:

```json
{
  "allowImproper": true
}
```

---

# 26. `math.fraction-circle`

Represents a circular fraction model.

Example:

```json
{
  "type": "math.fraction-circle",
  "props": {
    "numerator": 2,
    "denominator": 6
  }
}
```

The component MUST preserve equal partition semantics.

---

# 27. `math.coordinate-grid`

Represents a Cartesian coordinate system.

Example:

```json
{
  "type": "math.coordinate-grid",
  "props": {
    "x": {
      "min": -5,
      "max": 5,
      "step": 1
    },
    "y": {
      "min": -5,
      "max": 5,
      "step": 1
    },
    "points": [
      {
        "id": "A",
        "x": 2,
        "y": 3
      }
    ]
  }
}
```

Props:

```text
x
y
axes
grid
points
lines
regions
labels
```

---

# 28. `math.geometry-shape`

Represents a mathematical shape.

Example:

```json
{
  "type": "math.geometry-shape",
  "props": {
    "shape": "triangle",
    "vertices": 3
  }
}
```

Initial shapes:

```text
triangle
square
rectangle
circle
ellipse
pentagon
hexagon
octagon
parallelogram
rhombus
trapezoid
```

The component SHOULD expose semantic properties where applicable:

```text
sides
angles
vertices
radius
diameter
base
height
```

---

# 29. `math.angle`

Represents an angle.

Example:

```json
{
  "type": "math.angle",
  "props": {
    "degrees": 45,
    "showValue": true
  }
}
```

Props:

```text
degrees
radius
showValue
vertex
arms
arc
```

---

# 30. `math.measurement`

Represents a measurable quantity.

Supported concepts:

```text
length
mass
capacity
time
temperature
area
volume
```

Example:

```json
{
  "type": "math.measurement",
  "props": {
    "value": 25,
    "unit": "cm",
    "scale": {
      "min": 0,
      "max": 50
    }
  }
}
```

---

# 31. Science Components

## 31.1 `science.label-diagram`

Represents a diagram with semantic labels connected to targets.

Example:

```json
{
  "type": "science.label-diagram",
  "props": {
    "subject": "flower",
    "labels": [
      {
        "id": "petal-label",
        "text": {
          "key": "flower.petal"
        },
        "target": "petal"
      },
      {
        "id": "stem-label",
        "text": {
          "key": "flower.stem"
        },
        "target": "stem"
      }
    ]
  }
}
```

The diagram MUST distinguish:

```text
label
target
relationship
```

Labels are not merely positioned text.

---

# 32. `science.process-diagram`

Represents ordered scientific processes.

Example:

```json
{
  "type": "science.process-diagram",
  "props": {
    "steps": [
      {
        "id": "step-1",
        "label": {
          "key": "process.step1"
        }
      },
      {
        "id": "step-2",
        "label": {
          "key": "process.step2"
        }
      }
    ]
  }
}
```

The semantic relationship is:

```text
step-1 → step-2
```

not merely two boxes connected by a line.

---

# 33. `science.cycle`

Represents cyclical processes.

Example:

```json
{
  "type": "science.cycle",
  "props": {
    "steps": [
      "evaporation",
      "condensation",
      "precipitation",
      "collection"
    ]
  }
}
```

The component MUST preserve cyclic ordering.

---

# 34. `science.hierarchy`

Represents hierarchical relationships.

Examples:

```text
classification
food chain
taxonomy
organization
systems
```

Props:

```text
root
nodes
relationships
orientation
```

---

# 35. General Components

## 35.1 `general.timeline`

Represents events in temporal order.

Example:

```json
{
  "type": "general.timeline",
  "props": {
    "events": [
      {
        "id": "event-1",
        "date": "1857",
        "title": {
          "key": "event.1857"
        }
      },
      {
        "id": "event-2",
        "date": "1947",
        "title": {
          "key": "event.1947"
        }
      }
    ]
  }
}
```

The timeline MUST preserve ordering.

---

# 36. `general.comparison`

Represents comparison between semantic entities.

Example:

```json
{
  "type": "general.comparison",
  "props": {
    "items": [
      {
        "id": "a",
        "label": "A",
        "value": 4
      },
      {
        "id": "b",
        "label": "B",
        "value": 7
      }
    ],
    "comparison": "greater-than"
  }
}
```

---

# 37. `general.flowchart`

Represents logical or procedural flow.

Node types:

```text
start
process
decision
input
output
end
```

Relationships:

```text
next
yes
no
branch
merge
```

The component MUST represent these relationships semantically.

---

# 38. Component Composition

Components can contain components.

Example:

```json
{
  "type": "science.label-diagram",
  "children": [
    {
      "type": "core.legend"
    }
  ]
}
```

Composition rules:

1. Child components MUST have unique IDs.
2. Child components MUST remain semantically addressable.
3. Parent components MUST NOT modify child meaning.
4. Parent layout may influence child placement.
5. Accessibility reading order must remain deterministic.

---

# 39. Component Slots

Complex components MAY expose named slots.

Example:

```json
{
  "type": "science.label-diagram",
  "slots": {
    "title": "diagram-title",
    "body": "diagram-body",
    "legend": "diagram-legend"
  }
}
```

Slots allow composition without exposing internal implementation.

---

# 40. Internal Structure vs Public Contract

A component may internally contain many elements.

For example:

```text
fraction-bar
    │
    ├── container
    ├── partition 1
    ├── partition 2
    ├── partition 3
    ├── partition 4
    └── label
```

These internal elements are implementation details unless explicitly exposed.

The public contract remains:

```text
fraction-bar
numerator = 3
denominator = 4
```

---

# 41. Component States

Components MAY declare possible semantic states.

Example:

```json
{
  "states": [
    "default",
    "selected",
    "highlighted",
    "correct",
    "incorrect",
    "disabled"
  ]
}
```

The component specification declares available states.

The learner application owns current runtime state.

The component MUST NOT persist runtime state in the visual specification.

---

# 42. Interaction Contract

Interactive components MAY declare supported interactions.

Example:

```json
{
  "interaction": {
    "supported": [
      "click",
      "focus",
      "drag",
      "drop"
    ]
  }
}
```

Interactions MUST refer to semantic actions.

Example:

```json
{
  "on": "click",
  "action": "select"
}
```

Never:

```json
{
  "onClick": "() => ..."
}
```

---

# 43. Responsive Behavior

Components SHOULD support semantic responsive behavior.

For example, a number line may change:

```text
horizontal → vertical
```

when insufficient width is available.

The component should express:

```json
{
  "responsive": {
    "preferredOrientation": "horizontal",
    "fallbackOrientation": "vertical"
  }
}
```

rather than requiring fixed breakpoints.

---

# 44. Theme Integration

Components MUST consume semantic theme tokens.

Example:

```json
{
  "style": {
    "primary": "accent.primary",
    "label": "text.primary",
    "background": "surface.default"
  }
}
```

Components MUST NOT hard-code colors.

Bad:

```json
{
  "fill": "#FF0000"
}
```

Preferred:

```json
{
  "fill": "feedback.incorrect"
}
```

---

# 45. Accessibility Requirements

Every component MUST define:

1. accessible name strategy
2. accessible description strategy where appropriate
3. reading order
4. semantic role
5. interactive state representation
6. alternative representation when visual meaning is important

Example:

```json
{
  "accessibility": {
    "role": "img",
    "name": {
      "required": true
    },
    "description": {
      "supported": true
    },
    "alternativeRepresentation": {
      "supported": true
    }
  }
}
```

---

# 46. Alternative Representations

Complex educational visuals SHOULD support a structured textual representation.

Example:

```text
Number line from 0 to 10.
Point A is located at 3.
Point B is located at 7.
```

The representation should be generated from semantic data, not manually duplicated.

---

# 47. Localization

Components MUST support localization through keys.

Example:

```json
{
  "label": {
    "key": "math.numberLine.zero"
  }
}
```

Variables:

```json
{
  "key": "fraction.description",
  "variables": {
    "numerator": 3,
    "denominator": 4
  }
}
```

---

# 48. Asset References

Components MAY use semantic asset references.

Example:

```json
{
  "asset": {
    "type": "illustration",
    "id": "flower-anatomy"
  }
}
```

Components MUST NOT embed arbitrary remote URLs by default.

Assets are resolved through the asset system.

---

# 49. Custom Components

The registry supports custom components.

Example:

```json
{
  "id": "openedU.custom.rain-cycle",
  "version": "1.0.0"
}
```

Custom components MUST:

- use a namespace
- provide a prop schema
- declare capabilities
- provide accessibility metadata
- provide validation
- provide at least one renderer
- remain semantically defined

---

# 50. Component Namespacing

Reserved namespaces:

```text
core.*
math.*
science.*
general.*
```

Third-party namespaces MUST identify their owner/project.

Examples:

```text
openedU.*
knowledgeassemble.*
example.org.*
```

A component MUST NOT claim another namespace.

---

# 51. Renderer Contract

A component renderer receives:

```text
Component Instance
        +
Resolved Theme
        +
Resolved Layout
        +
Resolved Locale
        +
Renderer Context
```

It returns a semantic scene or renderer-specific intermediate representation.

Conceptually:

```typescript
interface ComponentRenderer {
  render(
    instance: ComponentInstance,
    context: RenderContext
  ): SemanticScene;
}
```

The renderer MUST NOT require application-specific state.

---

# 52. Renderer Independence

A component may have multiple renderers:

```text
math.number-line
 ├── svg renderer
 ├── html renderer
 └── canvas renderer
```

The component definition remains unchanged.

---

# 53. Validation

Component validation occurs at four levels.

## Level 1 — Schema

Checks:

```text
correct types
required props
valid enums
valid structure
```

## Level 2 — Semantic

Checks:

```text
min < max
numerator <= denominator
valid references
valid relationships
```

## Level 3 — Layout

Checks:

```text
minimum dimensions
overflow
overlap
readability
touch targets
```

## Level 4 — Accessibility

Checks:

```text
accessible name
reading order
interactive semantics
alternative representation
```

---

# 54. Validation Errors

Errors SHOULD be structured.

Example:

```json
{
  "code": "INVALID_PROP",
  "component": "math.number-line",
  "prop": "step",
  "message": "step must be greater than zero"
}
```

AI agents should receive machine-readable errors.

---

# 55. AI Agent Interface

AI agents SHOULD have access to:

```text
Component Registry
        │
        ├── component definitions
        ├── prop schemas
        ├── examples
        ├── capabilities
        ├── constraints
        ├── accessibility rules
        └── validation errors
```

An agent prompt can therefore say:

```text
Create a number line from -5 to 5,
highlight 2 and 4,
and label both points.
```

The agent should generate:

```json
{
  "type": "math.number-line",
  "props": {
    "min": -5,
    "max": 5,
    "step": 1,
    "points": [
      {
        "value": 2,
        "label": "2"
      },
      {
        "value": 4,
        "label": "4"
      }
    ]
  }
}
```

It should NOT generate SVG.

---

# 56. AI Agent Selection Strategy

Agents SHOULD follow this order:

```text
1. Search component registry
2. Find existing component
3. Check component capabilities
4. Construct props
5. Validate
6. Compose components if necessary
7. Use primitives only if no suitable component exists
```

The agent SHOULD prefer:

```text
existing component
```

over:

```text
custom geometry
```

---

# 57. Component Selection Metadata

Each component SHOULD expose keywords.

Example:

```json
{
  "keywords": [
    "fraction",
    "parts",
    "whole",
    "numerator",
    "denominator"
  ]
}
```

This allows agents to discover components semantically.

---

# 58. Component Recipes

The repository SHOULD maintain recipes for common educational visuals.

Example:

```text
recipes/
├── fractions/
│   ├── compare-fractions.md
│   ├── equivalent-fractions.md
│   └── fraction-of-whole.md
├── mathematics/
│   ├── integer-number-line.md
│   └── coordinate-point.md
└── science/
    ├── plant-parts.md
    └── water-cycle.md
```

Recipes teach agents how to combine components.

---

# 59. Example: Fraction Comparison

```json
{
  "type": "general.comparison",
  "children": [
    {
      "id": "fraction-a",
      "type": "math.fraction-bar",
      "props": {
        "numerator": 3,
        "denominator": 4
      }
    },
    {
      "id": "fraction-b",
      "type": "math.fraction-bar",
      "props": {
        "numerator": 2,
        "denominator": 3
      }
    }
  ]
}
```

The semantic relationship:

```text
fraction-a compares-with fraction-b
```

should exist independently of their visual positions.

---

# 60. Example: Flower Label Diagram

```json
{
  "type": "science.label-diagram",
  "props": {
    "subject": {
      "asset": "flower"
    },
    "labels": [
      {
        "id": "petal",
        "text": {
          "key": "flower.petal"
        },
        "target": "petal"
      },
      {
        "id": "stem",
        "text": {
          "key": "flower.stem"
        },
        "target": "stem"
      },
      {
        "id": "leaf",
        "text": {
          "key": "flower.leaf"
        },
        "target": "leaf"
      }
    ]
  }
}
```

Relationships:

```text
petal-label → labels → petal
stem-label  → labels → stem
leaf-label  → labels → leaf
```

---

# 61. Example: Interactive Number Line

```json
{
  "id": "number-line-1",
  "type": "math.number-line",
  "props": {
    "min": 0,
    "max": 10,
    "step": 1,
    "points": [
      {
        "id": "point-a",
        "value": 4
      }
    ]
  },
  "interaction": {
    "enabled": true,
    "targets": [
      {
        "target": "point-a",
        "events": ["click", "focus"],
        "actions": ["select"]
      }
    ]
  }
}
```

The component declares the interaction surface.

The learner runtime decides what happens after selection.

---

# 62. What Components Must Never Contain

Components MUST NOT contain:

```text
JavaScript
React components
DOM nodes
event handler functions
SVG XML
SVG path strings
CSS
HTML
browser APIs
database queries
analytics calls
lesson IDs
course IDs
application routes
authentication state
user data
LLM prompts
```

This is a critical architectural boundary.

---

# 63. Component vs Primitive

Use a **component** when the visual has educational semantics.

Examples:

```text
number-line
fraction-bar
clock
coordinate-grid
timeline
label-diagram
```

Use a **primitive** when it is merely a visual building block.

Examples:

```text
circle
line
rectangle
text
polygon
```

Decision rule:

> If an educator can name the visual concept independently of its geometry, it probably belongs as a component.

---

# 64. Component vs OpenEdu Widget

These are intentionally different layers.

```text
OpenEdu Lesson
      │
      ▼
OpenEdu Widget
      │
      ▼
Visual Specification
      │
      ▼
KnowledgeAssemble Component
      │
      ▼
Renderer
      │
      ▼
SVG
```

For example:

```text
OpenEdu:
science.label-diagram widget

uses:

KnowledgeAssemble:
science.label-diagram component
```

The KnowledgeAssemble component MUST NOT know that OpenEdu exists.

This allows the visual engine to be reused by:

- OpenEdu
- other educational applications
- authoring tools
- AI agents
- publishing systems
- accessibility tools
- future products

---

# 65. Component Versioning

Component versions MUST be immutable once published.

Example:

```text
math.number-line@1.0.0
math.number-line@1.1.0
math.number-line@2.0.0
```

A visual specification SHOULD record the component version when deterministic reproducibility is required.

Example:

```json
{
  "type": "math.number-line",
  "version": "1.1.0"
}
```

---

# 66. Compatibility

A component update is:

### Patch

Bug fix without changing semantic contract.

```text
1.0.0 → 1.0.1
```

### Minor

Backward-compatible capability or prop addition.

```text
1.0.0 → 1.1.0
```

### Major

Breaking semantic or prop change.

```text
1.0.0 → 2.0.0
```

---

# 67. Testing Requirements

Every component MUST have:

```text
schema tests
semantic validation tests
render tests
accessibility tests
localization tests
responsive tests
snapshot tests
```

Minimum fixture set:

```text
minimal
typical
edge-case
invalid
accessibility
localized
interactive
```

---

# 68. Golden Fixtures

The repository SHOULD maintain canonical component fixtures.

Example:

```text
fixtures/
├── number-line-basic.json
├── number-line-negative.json
├── fraction-three-fourths.json
├── coordinate-grid-basic.json
├── flower-label-diagram.json
└── water-cycle.json
```

These fixtures are useful for:

- regression testing
- AI examples
- documentation
- renderer testing

---

# 69. Deterministic Rendering

Given:

```text
component
+
component version
+
theme
+
locale
+
engine version
```

the resulting semantic scene MUST be deterministic.

Equivalent inputs MUST NOT randomly change layout.

---

# 70. Complexity Limits

Components MAY declare complexity limits.

Example:

```json
{
  "constraints": {
    "maximumChildren": 100,
    "maximumLabels": 30
  }
}
```

This prevents AI agents from accidentally producing enormous visuals.

---

# 71. Security

Component definitions MUST be treated as declarative data.

They MUST NOT execute:

```text
scripts
JavaScript
HTML
remote code
event-handler strings
javascript: URLs
```

External resources MUST pass through an asset resolver.

---

# 72. Recommended Repository Structure

```text
packages/
└── visual-engine/
    ├── src/
    │   ├── registry/
    │   │   ├── ComponentRegistry.ts
    │   │   └── ComponentDefinition.ts
    │   │
    │   ├── components/
    │   │   ├── core/
    │   │   ├── mathematics/
    │   │   ├── science/
    │   │   └── general/
    │   │
    │   ├── validation/
    │   ├── expansion/
    │   ├── layout/
    │   └── rendering/
    │
    ├── schemas/
    │   ├── component-definition.v1.json
    │   └── component-instance.v1.json
    │
    ├── fixtures/
    │
    └── tests/
        ├── components/
        ├── validation/
        ├── rendering/
        └── accessibility/

docs/
└── components/
    ├── core/
    ├── mathematics/
    ├── science/
    └── general/

recipes/
└── ...
```

---

# 73. Component Documentation

Every component MUST have documentation containing:

```text
Name
ID
Description
Educational purpose
Props
Defaults
Constraints
Accessibility
Localization
Interactions
Examples
Non-examples
Renderer support
```

Example:

```text
docs/components/mathematics/number-line.md
```

---

# 74. Minimum Viable Component Library

The first implementation SHOULD NOT attempt to build the entire library.

Recommended vertical slice:

```text
core.group
core.row
core.stack

math.number-line
math.fraction-bar

science.label-diagram

general.timeline
```

These six components exercise:

- layout
- semantic data
- relationships
- labels
- accessibility
- localization
- composition
- AI generation
- SVG rendering

---

# 75. Component Development Workflow

New component workflow:

```text
1. Identify educational concept
        ↓
2. Define semantic model
        ↓
3. Define props
        ↓
4. Define constraints
        ↓
5. Define accessibility contract
        ↓
6. Define localization contract
        ↓
7. Define component schema
        ↓
8. Implement semantic expansion
        ↓
9. Implement renderer
        ↓
10. Add fixtures
        ↓
11. Add validation tests
        ↓
12. Add accessibility tests
        ↓
13. Add AI recipe
        ↓
14. Register component
```

---

# 76. Component Design Checklist

Before adding a component, ask:

### Semantic

- What educational concept does it represent?
- Can its meaning be expressed without SVG?
- Is this actually a reusable concept?

### Reuse

- Does an existing component already solve this?
- Can this be composed from existing components?

### Props

- Are props semantic?
- Are they typed?
- Are constraints explicit?
- Are defaults sensible?

### Accessibility

- Does it have an accessible name?
- Can its meaning be represented textually?
- Is reading order deterministic?
- Are interactive targets accessible?

### Localization

- Can every user-facing string be localized?
- Are labels represented by localization keys?

### Rendering

- Can it render without relying on SVG-specific features?
- Can it scale?
- Can it support different themes?

### AI

- Can an AI agent discover it?
- Can an AI agent configure it without implementation knowledge?
- Are examples available?

---

# 77. Anti-Patterns

## SVG-as-component

Bad:

```text
flower.svg
```

with arbitrary paths and labels.

Prefer:

```text
science.label-diagram
```

with semantic flower parts.

---

## Coordinate-as-semantics

Bad:

```json
{
  "x": 184,
  "y": 72
}
```

as the primary representation of meaning.

Prefer:

```json
{
  "target": "petal"
}
```

and let layout determine coordinates.

---

## Component-as-application

Bad:

```text
OpenEduFractionQuestionComponent
```

inside the visual engine.

Prefer:

```text
math.fraction-bar
```

and let OpenEdu implement the lesson/question behavior.

---

## Component-as-SVG-template

Bad:

```text
component → hard-coded SVG
```

Prefer:

```text
component
 → semantic expansion
 → layout
 → renderer
 → SVG
```

---

# 78. Architectural Boundary

The most important boundary is:

```text
┌───────────────────────────────────────────┐
│ KnowledgeAssemble Visual Engine           │
│                                           │
│ Visual Specification                      │
│ Component Registry                        │
│ Semantic Components                       │
│ Layout                                    │
│ Accessibility                             │
│ Rendering                                 │
│ SVG / HTML / Canvas                       │
└───────────────────────────────────────────┘
                     ▲
                     │
              integration API
                     │
┌───────────────────────────────────────────┐
│ OpenEdu                                   │
│                                           │
│ Courses                                   │
│ Lessons                                   │
│ Widgets                                   │
│ Assessments                               │
│ Learner state                             │
│ Authoring                                 │
│ AI companion                              │
└───────────────────────────────────────────┘
```

OpenEdu owns **educational application behavior**.

KnowledgeAssemble Visual Engine owns **visual representation**.

Neither layer should leak its internal model into the other.

---

# 79. Final Principle

The component system exists to make this possible:

```text
Human:
"Show a child that 3/4 is greater than 2/3."

AI:
    ↓
Select components
    ↓
Construct semantic specification
    ↓
Validate
    ↓
Visual Engine
    ↓
Layout
    ↓
Accessibility
    ↓
SVG
```

The AI should reason about:

```text
fractions
comparison
relationships
labels
meaning
```

—not:

```text
SVG paths
pixels
coordinates
DOM
CSS
```

That separation is the foundation of the KnowledgeAssemble Visual Engine.