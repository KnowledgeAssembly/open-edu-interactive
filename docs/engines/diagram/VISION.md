# OpenEdu Diagram Engine — Vision Specification

**Status:** Draft  
**Version:** 0.1  
**Parent System:** OpenEdu Interactive Engine  
**Engine:** Diagram Engine

---

# 1. Vision

The OpenEdu Diagram Engine transforms relationships, structures, systems, and processes into interactive learning experiences.

It is not simply a diagram renderer or flowchart library.

Its purpose is to help learners:

- understand relationships
- decompose complex systems
- follow processes
- recognize structure
- understand cause and effect
- connect concepts
- explore networks
- understand cycles
- model systems
- manipulate representations
- construct knowledge

The core principle is:

> **A diagram should help the learner understand how things are connected.**

Where the Chart Engine makes **quantitative relationships** visible and the Timeline Engine makes **temporal relationships** visible, the Diagram Engine makes **structural and conceptual relationships** visible.

---

# 2. Why a Dedicated Diagram Engine?

Existing diagramming libraries generally answer:

> "How do I draw nodes and edges?"

OpenEdu needs to answer:

> "How can a learner use a representation of relationships to understand something?"

A conventional diagramming library focuses on:

- nodes
- connectors
- coordinates
- shapes
- labels
- layout

The OpenEdu Diagram Engine additionally understands:

- concepts
- entities
- relationships
- processes
- systems
- hierarchy
- causality
- sequence
- states
- learner interaction
- questions
- feedback
- accessibility

Therefore the Diagram Engine is an:

> **Interactive structural reasoning engine.**

---

# 3. Core Principle

The engine SHALL separate:

```text
Meaning
   ↓
Diagram Specification
   ↓
Diagram Semantic Model
   ↓
Layout
   ↓
Rendering

The author should describe:

"Water evaporates, condenses, and precipitates."

rather than:

"Put this box at x=240 and connect it to that box."

Coordinates are presentation details, not educational content.

4. Educational Role

The Diagram Engine can support several learning purposes.

4.1 Explain Structure

Show what something is made of.

Example:

Parts of a plant cell.

Cell
├── Nucleus
├── Cytoplasm
└── Cell membrane
4.2 Explain Process

Show how something happens.

Example:

Evaporation
      ↓
Condensation
      ↓
Precipitation
4.3 Explain Relationships

Show how concepts relate.

Example:

Photosynthesis
      │
      ├── uses → sunlight
      ├── uses → water
      └── produces → oxygen
4.4 Explain Systems

Represent interacting components.

Example:

Sun
 │
 ▼
Plant
 │
 ▼
Herbivore
 │
 ▼
Carnivore
4.5 Explain Causality

Represent cause-and-effect relationships.

Deforestation
      ↓
Less vegetation
      ↓
Soil erosion
      ↓
Reduced soil quality

The engine must distinguish causal relationships from simple associations.

4.6 Explain Hierarchy

Represent classification or organization.

Living Things
├── Plants
│   ├── Flowering
│   └── Non-flowering
└── Animals
    ├── Vertebrates
    └── Invertebrates
4.7 Explain Cycles

Represent systems that repeat.

Evaporation
     ↓
Condensation
     ↓
Precipitation
     ↓
Collection
     └──────────────→
4.8 Explore Networks

Represent many-to-many relationships.

Example:

Food web.

Plant ──→ Rabbit ──→ Fox
  │                    ↑
  └────→ Insect ───────┘
5. Diagram Families

The Diagram Engine SHOULD support a controlled collection of semantic diagram profiles.

Initial profiles:

flow
process
concept-map
mind-map
hierarchy
tree
cycle
causal
network
system
sequence
state-machine
scientific

These are profiles of one engine, not separate engines.

6. One Semantic Engine

The architecture should remain:

Diagram Engine
│
├── Semantic Model
├── Layout System
├── Interaction System
├── Accessibility System
└── Renderer

Not:

Flowchart Engine
MindMap Engine
Network Engine
Cycle Engine
...

The same underlying primitives can support multiple diagram families.

7. Core Semantic Model

The conceptual model is:

Diagram
│
├── Nodes
├── Edges
├── Groups
├── Relationships
├── Labels
├── Annotations
├── Layout
├── Interaction
├── Questions
├── Accessibility
└── State

The central idea is:

Relationships are first-class data.

8. Nodes

A node represents an entity, concept, state, object, stage, or other meaningful element.

Examples:

Person
Concept
Object
Process step
State
Place
Event
Variable
Component
Category

Example:

{
  "id": "photosynthesis",
  "kind": "concept",
  "label": "Photosynthesis"
}
9. Edges

An edge represents a relationship between nodes.

Examples:

connects-to
contains
part-of
causes
depends-on
produces
uses
transforms
precedes
leads-to
belongs-to
contrasts-with
supports

Example:

{
  "from": "sunlight",
  "to": "photosynthesis",
  "relationship": "provides-energy"
}

The relationship should have semantic meaning even if the visual representation changes.

10. Relationships Are More Important Than Lines

A common mistake in diagram systems is treating edges as:

"lines connecting boxes."

OpenEdu should treat them as:

semantic relationships.

For example:

A ──causes──→ B

and:

A ──part-of──→ B

are fundamentally different relationships even if both happen to be drawn as arrows.

This distinction is critical for:

AI authoring
accessibility
assessment
semantic search
lesson generation
alternative representations
11. Relationship Vocabulary

The engine should support a controlled relationship vocabulary.

Examples:

causes
influences
depends-on
contains
part-of
belongs-to
produces
consumes
transforms
precedes
follows
supports
contradicts
similar-to
different-from
connected-to

Domains may extend this vocabulary.

For example, biology could use:

eats
predates
pollinates
reproduces
12. Groups

Groups represent meaningful collections of nodes.

Example:

Animal Cell
┌─────────────────────────────┐
│                             │
│  Nucleus    Cytoplasm       │
│                             │
│  Cell Membrane              │
│                             │
└─────────────────────────────┘

Groups may represent:

systems
categories
phases
boundaries
regions
functional units
conceptual clusters
13. Hierarchical Structures

The engine should support nested structures.

Example:

Computer
│
├── Hardware
│   ├── CPU
│   ├── Memory
│   └── Storage
│
└── Software
    ├── Operating System
    └── Applications

Hierarchy can be represented semantically rather than through fixed visual indentation.

14. Process Diagrams

Processes should be first-class.

Example:

Input
  ↓
Transformation
  ↓
Output

A process node may have:

input
action
condition
output

This enables educational diagrams for:

scientific processes
manufacturing
algorithms
biological processes
mathematical procedures
historical processes
everyday workflows
15. Conditions and Branching

Process diagrams should support decisions.

Example:

             ┌── Yes ──→ Action A
             │
Start → Condition
             │
             └── No ───→ Action B

Semantic relationships should capture the condition.

For example:

{
  "from": "condition",
  "to": "action-a",
  "relationship": "branches",
  "condition": "yes"
}
16. Cycles

Cycles should be explicitly supported.

Example:

A → B → C → D
↑           │
└───────────┘

Cycles are important for:

water cycle
carbon cycle
rock cycle
life cycles
feedback systems
iterative algorithms

The engine should understand the cycle semantically rather than merely drawing a loop.

17. State Diagrams

The engine should support state transitions.

Example:

Seed
  │
  │ germination
  ▼
Seedling
  │
  │ growth
  ▼
Plant

State diagrams can be used for:

software concepts
physics
chemistry
biology
behavior
machines
processes
18. Scientific Diagrams

Scientific diagrams should be treated as semantic diagrams rather than static illustrations.

Examples:

Cell
Human heart
Digestive system
Solar system
Atom
Electric circuit
Water cycle
Food web

The engine should support:

labels
callouts
parts
relationships
highlighting
guided exploration
learner labeling
hotspots
annotations
19. Interactive Labeling

A learner should be able to identify components.

Example:

Label the parts of the cell.

The diagram provides:

Nucleus
Mitochondria
Cell membrane

The learner interacts with diagram regions or nodes.

The engine emits:

{
  "event": "node-identified",
  "target": "nucleus"
}

The lesson runtime can handle:

correctness
scoring
hints
feedback
progression
20. Highlighting

Highlighting is a core interaction.

Example:

      Sun
       │
       ▼
    [Plant]
       │
       ▼
    Herbivore

Selecting "Plant" may highlight:

Sun → Plant → Herbivore

This allows learners to trace relationships.

21. Path Exploration

The engine should support path-based exploration.

Examples:

Trace the flow of energy.

Follow the movement of blood.

Follow the steps in digestion.

Trace the food chain.

A learner can select a starting node and explore connected relationships.

22. Expand and Collapse

Complex diagrams should support progressive disclosure.

Example:

Computer
├── Hardware
└── Software

Click Hardware:

Hardware
├── CPU
├── Memory
├── Storage
└── GPU

This avoids overwhelming the learner.

23. Focus Mode

The engine SHOULD support focusing on one relationship or subgraph.

Example:

Full system
      ↓
Select "Respiration"
      ↓
Relevant components highlighted
      ↓
Unrelated components visually reduced

This allows large diagrams to remain understandable.

24. Layout

Layout is a rendering concern, but it should be configurable semantically.

Possible layout strategies:

hierarchical
tree
flow
radial
force
circular
layered
grid
manual

Authors should generally specify:

{
  "layout": {
    "type": "hierarchical"
  }
}

rather than manually positioning every node.

25. Automatic Layout

The engine SHOULD provide automatic layout.

The layout system should consider:

graph structure
hierarchy
edge direction
node importance
labels
grouping
available viewport
interaction state

Automatic layout should optimize for:

comprehension, not mathematical perfection.

26. Stable Layout

The engine should avoid unnecessary layout changes.

If the learner selects a node:

Before
A ──→ B ──→ C

After selection
A ──→ [B] ──→ C

not:

A
       C
  B

unless a meaningful structural change requires it.

Stable spatial relationships reduce cognitive load.

27. Animation

Animation should explain transitions.

Good:

A
 ↓
B
 ↓
C

where the flow is revealed sequentially.

Bad:

Nodes constantly moving

without pedagogical purpose.

Animation SHOULD:

be purposeful
be optional
respect reduced-motion preferences
avoid distracting loops
preserve comprehension
28. Learner Activities

The Diagram Engine should support reusable activity patterns.

Identify

Find the nucleus.

Connect

Connect each component to its function.

Sequence

Put the process steps in order.

Classify

Move each item into the correct category.

Trace

Follow the path of energy.

Complete

Fill the missing node.

Predict

What happens after this step?

Construct

Build the process using these components.

Explain

Which relationship explains this outcome?

29. Diagram Completion

A diagram can contain intentional gaps.

Example:

A → B → [ ? ] → D

The learner selects:

C

The engine validates the structural relationship.

This makes diagrams active learning objects rather than passive illustrations.

30. Drag-and-Drop Construction

The engine MAY support learner construction.

Example:

Available:
[A] [B] [C] [D]

Build the correct process:

[ ] → [ ] → [ ] → [ ]

The learner constructs the representation.

The lesson runtime determines correctness.

31. Accessibility

Accessibility SHALL be part of the engine contract.

Visual
sufficient contrast
readable labels
clear node states
non-color-only relationships
scalable rendering
Motor
keyboard navigation
accessible selection
alternatives to drag-and-drop
sufficiently large interaction targets
Cognitive
predictable layout
progressive disclosure
focus mode
reduced complexity
stable spatial relationships
32. Semantic Accessibility

A diagram should have an accessible semantic representation.

For example:

"Photosynthesis is a process in which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen."

The system should be able to expose:

Node: sunlight
Relationship: provides energy to
Node: photosynthesis

Node: water
Relationship: input to
Node: photosynthesis

Node: photosynthesis
Relationship: produces
Node: oxygen

This is substantially more useful than:

"Image containing several boxes and arrows."

33. Alternative Representation

Every diagram should be representable as structured relationships.

For example:

Photosynthesis
├── requires → sunlight
├── requires → water
├── requires → carbon dioxide
└── produces → oxygen

This representation can support:

screen readers
text mode
search
AI reasoning
assessment
indexing

The visual diagram becomes one representation of the semantic model.

34. Localization

Localization should cover:

node labels
relationship labels
descriptions
annotations
instructions
accessibility text

The semantic relationship itself should remain language-independent.

For example:

relationship: "causes"

can be localized to the appropriate learner language.

35. Theming

The Diagram Engine SHALL consume OpenEdu design tokens.

It should inherit:

Typography
Spacing
Surface
Border
Radius
Motion
Contrast
Dark mode
Accessibility preferences

The engine should not impose an unrelated visual language.

36. Visual Restraint

Default diagrams should be:

Clear
Structured
Calm
Readable
Predictable

Avoid:

excessive decoration
unnecessary 3D effects
visual noise
excessive colors
decorative connectors

Visual differentiation should communicate semantic meaning.

37. Semantic Visual Encoding

The engine should use visual properties consistently.

Possible encodings:

Shape
Size
Line style
Arrow direction
Grouping
Position
Label
Motion

For example:

solid arrow
→ process flow

dashed arrow
→ dependency

boundary
→ group/system

double arrow
→ bidirectional relationship

The exact visual encoding should be theme-controlled.

38. State

Diagram state should be serializable.

Possible state:

selectedNode
selectedEdge
highlightedPath
expandedGroups
collapsedGroups
focusedSubgraph
interactionMode
learnerPlacements
completedInteractions

This enables:

persistence
assessment
analytics
replay
collaborative learning
deterministic testing
39. Events

The engine should emit semantic events.

Examples:

diagram-mounted
node-selected
edge-selected
node-expanded
node-collapsed
path-selected
relationship-followed
node-placed
node-connected
diagram-completed
diagram-reset
interaction-completed

Prefer:

{
  "event": "relationship-followed",
  "from": "plant",
  "to": "herbivore",
  "relationship": "eaten-by"
}

over renderer-specific events such as:

svg-path-clicked
40. AI Authoring

The Diagram Engine should be designed for AI-native authoring.

An AI agent should be able to receive:

Subject
Learning objective
Concepts
Relationships
Learner level
Diagram type
Interaction requirement
Accessibility requirements

and generate a valid Diagram Specification.

For example:

Create a Grade 5 diagram explaining the water cycle. Show evaporation, condensation, precipitation, and collection as a cycle. Allow the learner to click each stage for an explanation.

The AI should generate:

Diagram
+
Semantic nodes
+
Relationships
+
Layout
+
Interaction
+
Accessibility description

without writing UI code.

41. AI Safety Around Relationships

AI-generated relationships require special care.

The engine should distinguish:

fact
inference
association
causal claim

An AI must not automatically turn:

"A occurs before B"

into:

"A causes B."

Similarly:

"A is associated with B"

must not become:

"A produces B."

Semantic relationship types therefore provide an important guardrail for AI-generated educational content.

42. Validation

Diagram specifications should be validated before rendering.

Structural
valid JSON
valid diagram profile
unique node IDs
valid edge references
Graph
no invalid references
valid relationship types
valid group membership
valid hierarchy
Semantic
relationship types compatible with source/target
causal claims explicitly marked
process direction valid where required
Educational
activity targets exist
questions reference valid nodes
completion rules are valid
Accessibility
meaningful title
description
semantic relationship representation
keyboard-accessible interaction
43. Renderer Independence

The Diagram Specification MUST remain independent from rendering technology.

Possible implementations:

SVG
Canvas
DOM
WebGL

The architecture should be:

Diagram Specification
        ↓
Diagram Semantic Model
        ↓
Layout Engine
        ↓
Renderer

The renderer should never become the source of truth.

44. Determinism

Given:

Diagram Specification
+
Engine Version
+
Theme
+
Locale

the semantic behavior should be deterministic.

Automatic layout may have implementation-specific differences, but:

node identity
relationships
interaction semantics
state transitions
validation

must remain deterministic.

45. Engine Composition

Diagram Engine should compose naturally with the other OpenEdu engines.

Diagram + Timeline
Select historical period
        ↓
Diagram displays system state

Example:

Evolution of a political system over time.

Diagram + GeoMap
Select region
        ↓
Diagram displays local relationships

Example:

River system and surrounding ecosystems.

Diagram + Chart
Change diagram variable
        ↓
Chart updates

Example:

Change population in a food web and observe ecosystem effects.

Diagram + Visual
Select diagram node
        ↓
Visual displays corresponding image

Example:

Select an organ → display its anatomical illustration.

46. Diagram as a Knowledge Graph Interface

One long-term possibility is for the Diagram Engine to become a visual interface over structured knowledge.

Conceptually:

Knowledge
    │
    ▼
Semantic Graph
    │
    ├── Diagram
    ├── Text
    ├── Search
    ├── Questions
    └── AI reasoning

The diagram then becomes one view of the underlying knowledge model.

This is especially valuable for OpenEdu's broader knowledge-assembly architecture.

47. Diagram as a Reasoning Tool

The ultimate purpose is not to create attractive diagrams.

It is to support:

Observe
   ↓
Identify components
   ↓
Understand relationships
   ↓
Trace structure
   ↓
Manipulate model
   ↓
Predict outcome
   ↓
Reason
   ↓
Understand

The diagram becomes a model the learner can interrogate.

48. Example Learning Experience

Consider a lesson about an ecosystem.

The learner initially sees:

                 Sun
                  │
                  ▼
                Plants
               ↙      ↘
          Insects      Deer
              │          │
              └────┬─────┘
                   ▼
                 Tiger

The learner selects Plants.

The engine highlights:

Sun
 ↓
Plants
 ↓
Insects / Deer
 ↓
Tiger

The learner then selects Tiger.

The lesson asks:

"What might happen if the number of plants decreases significantly?"

The learner changes a parameter.

The Diagram Engine can emit the interaction.

A Chart Engine could then visualize the population changes.

The learner is no longer merely looking at a diagram.

They are reasoning through a model.

49. Design Principles

The Diagram Engine SHALL follow these principles:

1. Relationships are first-class

Lines are not merely visual connectors.

2. Meaning over geometry

Semantic relationships are the source of truth.

3. Structure over decoration

Visual hierarchy should communicate conceptual hierarchy.

4. Interaction with purpose

Interaction should support understanding.

5. Progressive complexity

Complex systems should be explorable rather than presented all at once.

6. Causality must be explicit

Temporal order or association must not imply causation.

7. Accessible by default

Every diagram should have a semantic alternative.

8. AI-native

Agents should be able to create and modify diagrams without UI code.

9. Renderer-independent

The semantic model must survive renderer changes.

10. Composable

Diagrams should communicate with other OpenEdu engines.

11. Deterministic

Semantic behavior should be reproducible.

12. Learner-centered

The goal is not:

"Create a beautiful diagram."

The goal is:

"Help the learner understand relationships, structure, and systems."

50. Long-Term Vision

The OpenEdu Diagram Engine should evolve from:

Diagram renderer

into:

Interactive structural reasoning engine

Ultimately:

Concepts
   ↓
Relationships
   ↓
Model
   ↓
Explore
   ↓
Manipulate
   ↓
Predict
   ↓
Reason
   ↓
Understand

The learner should be able to see a system, explore its structure, manipulate its relationships, and reason about its behavior.

51. Success Criteria

The Diagram Engine is successful when an OpenEdu author can express:

"Help the learner understand how these concepts, components, or processes are related."

without writing diagram UI code.

And the learner can:

see → connect → explore → manipulate → reason → understand.


With this, the three new engines have a coherent division of responsibility:

```text
                    OpenEdu Interactive Engine
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ▼              ▼       ▼        ▼              ▼
    Visual          GeoMap   Chart   Timeline       Diagram
    Engine          Engine   Engine    Engine        Engine
       │              │       │        │              │
     visual          space  numbers    time        relationships
       │              │       │        │              │
       └──────────────┴───────┴────────┴──────────────┘
                              │
                              ▼
                    Learner Reasoning

The next architectural step should be to define the shared `INTERACTIVE-ENGINE-SPEC.md` (see `../INTERACTIVE-ENGINE-SPEC.md`) before creating the five individual JSON schemas. That would prevent visual.json, geomap.json, chart.json, timeline.json, and diagram.json from developing five incompatible interaction/state/event models.
