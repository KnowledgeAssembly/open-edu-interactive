# OpenEdu Chart Engine — Vision Specification

**Status:** Draft  
**Version:** 0.1  
**Parent System:** OpenEdu Interactive Engine  
**Engine:** Chart Engine

---

## 1. Vision

The OpenEdu Chart Engine transforms quantitative information into interactive learning experiences.

It is not merely a chart renderer.

Its purpose is to help learners:

- see patterns
- compare quantities
- understand change
- recognize relationships
- interpret distributions
- test hypotheses
- manipulate variables
- reason from evidence

The core principle is:

> **A chart should help the learner think, not merely display data.**

The engine therefore treats data visualization as an interactive educational medium rather than a presentation component.

---

# 2. Why a Dedicated Chart Engine?

Traditional chart libraries answer:

> "How do I draw this dataset?"

OpenEdu needs to answer:

> "How can this dataset help a learner understand something?"

This distinction is fundamental.

A conventional chart library focuses on:

- axes
- scales
- colors
- labels
- tooltips
- legends

The OpenEdu Chart Engine additionally understands:

- educational intent
- learner interactions
- annotations
- questions
- comparisons
- predictions
- exploration
- feedback
- accessibility
- localization
- state
- events

The rendering technology is therefore an implementation detail.

---

# 3. Core Principle

The engine SHALL separate:

```text
Educational Meaning
        ↓
Chart Specification
        ↓
Chart Semantic Model
        ↓
Rendering

The OpenEdu course author or AI agent should describe what the chart means, rather than manually describing pixels.

For example:

{
  "type": "chart",
  "chart": {
    "kind": "line"
  },
  "data": {}
}

The specification should not require the author to know:

SVG coordinates
Canvas APIs
React components
charting-library APIs
CSS positioning
rendering internals
4. Educational Role

Charts can serve several educational purposes.

4.1 Explain

Present a relationship clearly.

Example:

Show how temperature changes throughout the day.

4.2 Compare

Allow learners to compare categories or quantities.

Example:

Compare the populations of five cities.

4.3 Show Change

Represent progression over time.

Example:

Show population growth over 100 years.

4.4 Reveal Relationships

Help learners identify correlation or other relationships.

Example:

Explore the relationship between study time and test scores.

4.5 Explore

Allow learners to manipulate or filter information.

Example:

Select different countries to compare GDP.

4.6 Predict

Ask learners to infer what happens next.

Example:

Based on the trend, predict the next value.

4.7 Investigate

Turn the chart into a small data investigation.

Example:

Which month had the greatest rainfall?

4.8 Construct

Allow learners to create or modify representations.

Example:

Drag points to create a graph representing the given data.

5. Chart Families

The engine SHOULD support a controlled set of meaningful chart families.

Initial families:

Bar
Line
Area
Scatter
Pie
Donut
Histogram
Stacked Bar
Grouped Bar
Box Plot

Additional families MAY be added later.

The engine SHOULD avoid supporting chart types simply because they are technically possible.

Every chart type should have a clear educational use.

6. Semantic Chart Model

The engine should conceptually model a chart as:

Chart
│
├── Purpose
├── Data
├── Dimensions
├── Measures
├── Encodings
├── Scale
├── Annotations
├── Interaction
├── Questions
├── Accessibility
└── State

This means a chart is more than:

type + data

It is an interactive semantic object.

7. Data as First-Class Content

Data should remain separate from presentation.

Conceptually:

Data
  ↓
Encoding
  ↓
Visualization

For example:

{
  "data": [
    {
      "year": 2020,
      "population": 1380000000
    },
    {
      "year": 2025,
      "population": 1460000000
    }
  ]
}

The visualization layer determines how that data is represented.

This allows the same dataset to potentially support:

a line chart
a bar chart
a comparison
a learner activity
a question
an accessible data table
8. Data Provenance

Where data represents real-world information, the specification SHOULD support provenance.

Possible metadata:

{
  "source": {
    "title": "Population estimates",
    "publisher": "Example Source",
    "url": "...",
    "retrievedAt": "..."
  }
}

The engine should distinguish between:

Authoritative data
Illustrative data
Simulated data
Learner-generated data
AI-generated example data

AI-generated or illustrative data MUST NOT be presented as authoritative real-world data.

9. Interaction Philosophy

Interaction should exist for a reason.

The engine SHOULD NOT add animation, hover effects, or controls merely because they are technically available.

Every interaction should answer:

What does this interaction help the learner understand?

Examples:

Hover
→ inspect a value

Click
→ focus a category

Drag
→ manipulate a variable

Select range
→ investigate a period

Toggle
→ compare datasets

Zoom
→ inspect detail

Scrub
→ explore change

Filter
→ isolate evidence
10. Learner Interaction

The engine SHOULD support a standardized interaction vocabulary.

Examples:

select
deselect
highlight
focus
filter
compare
zoom
pan
hover
drag
toggle
scrub
annotate
reset

These interactions SHOULD produce standardized engine events.

Example:

{
  "event": "selection-changed",
  "target": "india",
  "value": {}
}

The lesson runtime can then react.

11. Chart ↔ Lesson Interaction

The Chart Engine should be deeply integrated with the OpenEdu Interactive Engine.

For example:

Learner selects a bar
        ↓
Chart Engine emits event
        ↓
Lesson Runtime
        ↓
Feedback / explanation / next activity

This enables:

"Click the country with the highest population."

The chart can validate the learner's action without requiring the chart itself to understand the entire lesson.

12. Educational Questions

Charts SHOULD support question-oriented interactions.

Examples:

Identify

Which month had the highest rainfall?

Compare

Which country had the greater population?

Estimate

Approximately how many students passed?

Predict

What would you expect the next value to be?

Explain

What pattern do you notice?

Analyze

What evidence supports the claim?

The chart provides the visual evidence; the lesson system provides the pedagogical context.

13. Progressive Revelation

Charts SHOULD support progressive disclosure.

A complex dataset may initially show:

Core trend

Then reveal:

Individual points
        ↓
Additional series
        ↓
Annotations
        ↓
Raw values

This helps reduce cognitive load.

The default visualization should communicate the intended concept before exposing unnecessary detail.

14. Animation

Animation should communicate change or causality.

Good:

2020 → 2021 → 2022 → 2023

showing a dataset evolving over time.

Bad:

Bars bouncing continuously

with no educational purpose.

Animation MUST:

be optional
respect reduced-motion preferences
avoid distracting loops
support deterministic state
never be necessary for understanding the content
15. Annotation

Annotations are important educational primitives.

Examples:

Point annotation
Range annotation
Threshold
Event marker
Trend line
Reference line
Callout
Label
Question marker

Example:

             ●
           ╱
         ╱
───────╱──────────── threshold
      ↑
   key event

Annotations can turn a generic graph into an explanation.

16. Accessibility

Accessibility is a core requirement, not an enhancement.

The engine SHOULD provide:

Visual accessibility
sufficient contrast
readable labels
scalable rendering
non-color-dependent encoding
accessible focus states
Motor accessibility
keyboard interaction
alternative controls
no interaction requiring precise dragging where avoidable
Cognitive accessibility
predictable interaction
restrained visual complexity
clear legends
progressive disclosure
optional simplified view
Screen reader accessibility

The chart should expose a meaningful semantic representation.

For example:

"Line chart showing rainfall from January to May. Rainfall increases from 20 millimeters in January to 110 millimeters in May."

The underlying data should also be available in accessible tabular form.

17. Reduced Complexity Mode

Charts SHOULD support a simplified presentation mode.

For example:

Normal
│
├── legend
├── annotations
├── multiple series
└── controls

Simplified
│
├── one key series
├── essential labels
└── minimal controls

This is especially important for younger learners and learners who benefit from reduced cognitive load.

18. Responsive Design

Charts must work across:

Phone
Tablet
Desktop
Interactive classroom display

The chart should adapt without changing its semantic meaning.

The engine should control:

axis density
label placement
legend layout
tooltip behavior
interaction targets
annotation placement

rather than requiring authors to define screen-specific coordinates.

19. Localization

Chart content should support OpenEdu localization.

This includes:

titles
labels
legends
annotations
number formatting
decimal separators
units
dates
accessible descriptions

For example:

1,000

may need to become:

1.000

depending on locale.

The underlying numeric value must remain locale-independent.

20. Theming

The Chart Engine should consume OpenEdu design tokens.

It SHOULD NOT hard-code a visual identity.

The engine should inherit:

Typography
Spacing
Radius
Surface
Contrast
Motion
Dark mode
Accessibility preferences

from the OpenEdu design system.

Charts should feel native to the lesson rather than like embedded third-party widgets.

21. Visual Restraint

The default aesthetic should be:

Clear
Calm
Readable
Focused
Educational

Avoid unnecessary:

gradients
3D effects
decorative shadows
excessive colors
ornamental effects
visual noise

The chart's information should be the visual hierarchy.

22. Responsive Information Density

The engine should determine appropriate information density based on context.

For example:

Small screen
→ fewer visible labels

Large screen
→ more labels

Beginner learner
→ simplified representation

Advanced learner
→ greater detail

The underlying data must not be silently lost.

The presentation may simplify while the complete dataset remains accessible.

23. Engine State

The engine should maintain a clear state model.

Possible state:

selectedDataPoints
selectedSeries
highlightedItems
filters
zoom
viewport
activeAnnotation
interactionMode

State should be serializable.

This enables:

persistence
replay
assessment
analytics
collaborative learning
deterministic testing
24. Events

The engine should expose semantic events.

Examples:

chart-mounted
selection-changed
point-selected
series-toggled
range-selected
filter-changed
zoom-changed
annotation-selected
interaction-completed
chart-reset

Events should describe learner intent rather than renderer details.

Prefer:

{
  "event": "point-selected",
  "pointId": "2025"
}

over:

{
  "event": "svg-click",
  "elementId": "path-284"
}
25. AI Authoring

The Chart Engine should be designed for AI-generated content.

An AI agent should be able to receive:

Learning objective
Age / level
Subject
Dataset
Interaction requirement
Accessibility requirements

and produce a valid Chart Specification.

For example:

Create a line chart for Grade 6 showing temperature over seven days. Ask the learner to identify the hottest day.

The agent should generate:

Chart
+
Educational interaction
+
Question
+
Validation
+
Accessibility description

without needing to write UI code.

26. Validation

Every chart specification should be validated before rendering.

Validation should include:

Structural
valid JSON
required fields
valid chart type
valid data references
Data
valid values
compatible types
valid dimensions
valid scales
Educational
interaction targets exist
question references valid data
annotations reference valid objects
Accessibility
meaningful title
description where required
non-color-only encoding
accessible data representation
27. Renderer Independence

The Chart Engine specification MUST NOT depend on a specific visualization library.

Possible implementations include:

SVG
Canvas
DOM
WebGL

or different chart libraries.

The contract is:

OpenEdu Chart Specification
        ↓
Chart Semantic Model
        ↓
Renderer

not:

OpenEdu
        ↓
Specific chart library
28. Educational Composition

Charts should be composable with other OpenEdu engines.

Examples:

Chart + Timeline

Learner moves through time and the chart updates.

GeoMap + Chart

Learner selects a country and the chart displays its statistics.

Diagram + Chart

Learner changes a process variable and the chart displays the resulting data.

Visual + Chart

Learner compares an image with quantitative measurements.

This should eventually be enabled through the OpenEdu Interactive Engine event/binding system.

29. Chart as Evidence

One of the most important long-term goals is to teach learners to treat charts as evidence.

The engine should therefore support activities around:

Observation
        ↓
Comparison
        ↓
Pattern recognition
        ↓
Inference
        ↓
Evidence
        ↓
Conclusion

The chart becomes part of the learner's reasoning process.

30. Design Principles

The Chart Engine SHALL follow these principles:

1. Meaning over decoration

The visualization exists to communicate information.

2. Data over pixels

Data and semantics remain independent from rendering.

3. Interaction with purpose

Every interaction should support learning.

4. Accessible by default

Accessibility is part of the engine contract.

5. Progressive complexity

Start simple; reveal complexity when useful.

6. Renderer independence

Specifications should survive renderer changes.

7. AI-native authoring

Agents should be able to generate valid interactive charts.

8. Composable

Charts should communicate with other OpenEdu engines.

9. Deterministic

The same specification should produce predictable behavior.

10. Learner-centered

The ultimate unit of success is not visual fidelity.

It is:

Did the learner understand something better because of the chart?

31. Long-Term Vision

The OpenEdu Chart Engine should evolve from:

Chart Renderer

into:

Interactive Data Reasoning Engine

Ultimately, a chart in OpenEdu should be capable of becoming:

Dataset
   ↓
Visualization
   ↓
Exploration
   ↓
Question
   ↓
Learner interaction
   ↓
Evidence
   ↓
Reasoning
   ↓
Feedback
   ↓
Learning

That is the role of the Chart Engine within the OpenEdu Interactive Engine.

32. Success Criteria

The Chart Engine is successful when an OpenEdu author can express:

"Help the learner discover this relationship in this dataset."

without writing visualization code.

And an OpenEdu learner can:

see → interact → investigate → reason → understand.

That is the fundamental vision of the OpenEdu Chart Engine.
