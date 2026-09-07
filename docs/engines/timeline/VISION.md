# OpenEdu Timeline Engine — Vision Specification

**Status:** Draft  
**Version:** 0.1  
**Parent System:** OpenEdu Interactive Engine  
**Engine:** Timeline Engine

---

# 1. Vision

The OpenEdu Timeline Engine transforms time into an interactive learning space.

It is not simply a horizontal list of dates.

Its purpose is to help learners:

- understand sequence
- perceive duration
- compare periods
- discover temporal relationships
- understand change
- connect events
- explore historical context
- understand processes
- reason about cause and consequence

The core principle is:

> **A timeline should help the learner understand how things unfold through time.**

Time is therefore treated as an interactive dimension rather than merely metadata attached to events.

---

# 2. Why a Dedicated Timeline Engine?

A conventional timeline component generally answers:

> "How do I display a collection of dated items?"

OpenEdu needs to answer:

> "How can time become a medium through which a learner discovers relationships?"

A conventional timeline focuses on:

- dates
- labels
- markers
- ordering

The OpenEdu Timeline Engine additionally understands:

- events
- periods
- duration
- temporal relationships
- parallel histories
- causality
- context
- zoom
- exploration
- learner questions
- interaction
- accessibility

Therefore the Timeline Engine is an **interactive temporal reasoning system**.

---

# 3. Core Principle

The engine SHALL separate:

```text
Temporal Meaning
        ↓
Timeline Specification
        ↓
Timeline Semantic Model
        ↓
Rendering

Authors should describe:

"These events happened during these periods."

rather than:

"Put this element at x=240."

4. Educational Role

The Timeline Engine can support several learning modes.

4.1 Sequence

Understand what happened before and after.

Example:

Arrange the stages of the water cycle in the correct order.

4.2 Historical Context

Understand events within a broader period.

Example:

Explore important events during the Indian independence movement.

4.3 Duration

Understand how long something lasted.

Example:

Compare the duration of different ancient civilizations.

4.4 Parallel Development

Compare what happened in different places during the same period.

Example:

What was happening in India while the Roman Empire was expanding?

4.5 Change Over Time

Understand transformation.

Example:

Explore how a city changed between 1800 and 2000.

4.6 Cause and Consequence

Explore relationships between events.

Example:

What events contributed to the beginning of the Industrial Revolution?

4.7 Prediction

Ask:

What happened next?

The learner uses temporal context to make a prediction.

4.8 Investigation

Allow learners to explore an unfamiliar period.

Example:

Find all scientific discoveries between 1800 and 1900.

5. Temporal Model

The Timeline Engine should model several fundamental temporal primitives.

Timeline
│
├── Event
├── Period
├── Era
├── Milestone
├── Duration
├── Moment
├── Interval
├── Track
├── Relationship
└── Annotation

These are semantic concepts rather than rendering primitives.

6. Events

An event represents something occurring at a specific point or approximate point in time.

Example:

{
  "id": "independence",
  "type": "event",
  "date": "1947-08-15",
  "label": "Indian independence"
}

Events may represent:

historical events
discoveries
births
deaths
inventions
battles
publications
political events
scientific observations
milestones
learner events
7. Approximate Dates

Educational timelines often contain uncertain dates.

The engine SHOULD support:

Exact date
Approximate date
Date range
Before date
After date
Unknown precision

For example:

{
  "date": {
    "value": -2600,
    "precision": "approximate"
  }
}

The visual representation should communicate uncertainty rather than implying false precision.

8. Periods

A period represents a span of time.

Example:

{
  "id": "vedic",
  "type": "period",
  "start": -1500,
  "end": -500,
  "label": "Vedic period"
}

Periods are essential for understanding:

eras
civilizations
reigns
wars
geological periods
artistic movements
scientific eras
historical phases
9. Nested Time

Periods may contain smaller periods.

Example:

Ancient India
│
├── Early Vedic Period
├── Later Vedic Period
├── Mahajanapadas
└── Mauryan Period

The engine SHOULD support hierarchical temporal structures.

This allows learners to zoom from:

Millennia
    ↓
Centuries
    ↓
Decades
    ↓
Years
    ↓
Months
    ↓
Days

where meaningful.

10. Multiple Tracks

Many subjects require parallel timelines.

Example:

India       ──●──────●──────●──────●──
China       ─────●──────●────●────────
Europe      ─●────────●──────────●─────
Science     ──────●────────●───────────

The engine should support multiple semantic tracks.

A track could represent:

country
person
civilization
scientific field
technology
political movement
biological evolution
artistic movement
11. Comparative Timelines

Multiple timelines should remain synchronized.

For example:

          1800       1850       1900       1950
India       ●─────────●──────────●──────────●
Britain     ●────●───────────────●──────────
Science       ●──────●────●──────────●──────

A learner should be able to answer:

"What was happening elsewhere at this moment?"

This turns the timeline into a tool for contextual reasoning.

12. Temporal Relationships

The engine should support explicit temporal relationships.

Initial relationship vocabulary:

before
after
during
contains
starts-with
ends-with
overlaps
concurrent-with
adjacent-to
separated-by

These relationships should exist semantically even if they are not always visually rendered.

13. Causal Relationships

Causality is related to time but should not be confused with temporal order.

For example:

Event A
   │
   │ contributed to
   ▼
Event B

The Timeline Engine MAY represent causal relationships where pedagogically useful.

However:

"A happened before B" does not automatically mean "A caused B."

The specification should preserve this distinction.

14. Timeline Scale

The engine should support different temporal scales.

Geological
Millennial
Century
Decade
Year
Month
Week
Day
Hour
Minute
Second

The scale should be determined by the data and learning objective.

A timeline of the evolution of life should not use the same interaction model as a timeline of a school day.

15. Zoom

Zoom is one of the core Timeline Engine interactions.

Conceptually:

1000 years
     ↓ zoom
100 years
     ↓
10 years
     ↓
1 year
     ↓
1 month

Zoom should reveal appropriate information at each level.

For example:

Zoomed out
→ major historical periods

Zoomed in
→ individual events

Further zoom
→ detailed event information

This supports progressive disclosure.

16. Temporal Scrubbing

The learner should be able to move through time.

Example:

|────────────●────────────────|
             1850

Moving the temporal cursor may update:

maps
charts
diagrams
images
explanatory text
simulations

This is especially powerful when the Timeline Engine is composed with other OpenEdu engines.

17. Timeline as a Controller

A timeline can act as a control surface for another engine.

Example:

Timeline
   │
   │ selected year
   ▼
GeoMap
   │
   ▼
Map changes

Or:

Timeline
   │
   ▼
Chart
   │
   ▼
Data changes

Or:

Timeline
   │
   ▼
Visual
   │
   ▼
Image changes

This should be enabled through the shared OpenEdu Interactive Engine event system.

18. Progressive Revelation

The engine SHOULD allow information to appear progressively.

For example:

Stage 1
Major eras

Stage 2
Important events

Stage 3
People and places

Stage 4
Detailed descriptions

Stage 5
Primary sources / evidence

The learner should not be overwhelmed by all available information at once.

19. Timeline Interaction

Standard interactions should include:

select
focus
highlight
zoom
pan
scrub
filter
compare
expand
collapse
jump-to
reset

Example:

{
  "action": "focus",
  "target": "event-1947"
}
20. Learner Activities

The engine should support reusable activity patterns.

Identify

Find the event that happened in 1947.

Sequence

Put these events in chronological order.

Duration

Which period lasted the longest?

Compare

Compare the timelines of India and China.

Locate

Find the period when this civilization existed.

Predict

What event is likely to come next?

Connect

Which events occurred during the same period?

Investigate

Explore discoveries between 1800 and 1900.

21. Timeline Questions

Questions should reference semantic temporal structures.

Example:

{
  "question": {
    "type": "sequence",
    "targets": [
      "event-a",
      "event-b",
      "event-c"
    ]
  }
}

The timeline engine provides the interaction and state.

The lesson runtime provides:

question text
scoring
feedback
progression
22. Accessibility

Accessibility SHALL be part of the engine contract.

Visual
readable labels
sufficient contrast
scalable timeline
clear event states
non-color-dependent meaning
Keyboard

Users should be able to:

move between events
zoom
navigate tracks
select events
move the temporal cursor
Screen Readers

The timeline should expose meaningful temporal relationships.

For example:

"Mauryan Empire, approximately 322 to 185 BCE. This period overlaps with the early Hellenistic period."

23. Alternative Linear Representation

Every timeline should have an accessible alternative representation.

For example:

322 BCE — Mauryan Empire begins
268 BCE — Ashoka becomes emperor
232 BCE — Ashoka dies
185 BCE — Mauryan Empire ends

This should not be treated as a separate content source.

It should be generated from the same semantic timeline model.

24. Cognitive Accessibility

The engine should support:

reduced visual density
limited simultaneous events
simplified labels
predictable controls
progressive disclosure
focus mode
reduced motion

Complex historical timelines can become extremely dense.

The engine should therefore provide mechanisms for reducing information density without changing the underlying content.

25. Uncertainty and Historical Precision

The engine must avoid visually implying precision that the source does not support.

For example:

≈ 2600 BCE

should not become:

January 1, 2600 BCE

unless such precision is actually known.

This is particularly important for:

ancient history
archaeology
evolution
geology
uncertain discoveries
26. Localization

Timeline specifications should be locale-independent.

Localization should cover:

dates
calendars
month names
labels
descriptions
number formats
accessible descriptions

The engine should support multiple calendar representations where educationally appropriate.

The underlying temporal model must remain unambiguous.

27. Theming

The Timeline Engine SHALL consume OpenEdu design tokens.

It should inherit:

Typography
Spacing
Surface
Borders
Radius
Motion
Contrast
Dark mode
Accessibility settings

Timeline-specific visual styling should remain restrained.

28. Visual Language

The default visual language should communicate:

sequence
duration
relationship
hierarchy
focus

without excessive decoration.

The engine should avoid turning timelines into posters.

The learner should immediately understand:

where am I in time?

29. State

Timeline state should be serializable.

Possible state:

currentTime
selectedEvent
selectedTrack
zoomLevel
viewport
filters
expandedPeriods
focusedEvent
comparisonMode

This allows:

persistence
assessment
analytics
replay
collaborative learning
deterministic testing
30. Events

The engine should emit semantic events.

Examples:

timeline-mounted
event-selected
period-selected
time-changed
range-selected
track-selected
zoom-changed
filter-changed
comparison-changed
timeline-reset
interaction-completed

Events should represent learner intent rather than DOM implementation details.

31. Engine Composition

Timeline should be able to communicate with every other OpenEdu engine.

Timeline + GeoMap
Select year
     ↓
Map displays geographic state
Timeline + Chart
Select period
     ↓
Chart displays corresponding data
Timeline + Visual
Move through time
     ↓
Visual changes
Timeline + Diagram
Select historical stage
     ↓
Diagram highlights system state

This composition is one of the most important long-term capabilities of the engine.

32. AI Authoring

The engine should be designed for AI-native authoring.

An AI agent should be able to receive:

Subject
Learning objective
Time range
Events
Periods
Relationships
Learner level
Interaction requirement

and produce a valid Timeline Specification.

For example:

Create a Grade 7 timeline of the major events of the Indian independence movement. Include major milestones and allow learners to explore events by decade.

The agent should produce:

Timeline
+
Periods
+
Events
+
Relationships
+
Interactions
+
Accessibility description

without generating UI code.

33. Validation

Timeline specifications should be validated before rendering.

Structural
valid JSON
valid timeline type
required fields
unique identifiers
Temporal
valid dates
valid intervals
valid ranges
consistent chronology
Semantic
referenced events exist
referenced periods exist
relationships reference valid targets
Educational
questions reference valid timeline objects
activities have valid targets
Accessibility
meaningful title
meaningful description
accessible alternative representation
34. Renderer Independence

The Timeline Specification MUST remain independent from rendering technology.

Possible implementations:

SVG
Canvas
DOM
WebGL

The architecture should be:

Timeline Specification
        ↓
Temporal Semantic Model
        ↓
Timeline Renderer

not:

Timeline Specification
        ↓
specific UI library
35. Determinism

Given the same:

Timeline Specification
+
Engine Version
+
Theme
+
Locale

the engine should produce deterministic semantic behavior.

This is important for:

testing
assessment
publishing
caching
reproducibility
AI-generated courses
36. Timeline as a Learning Space

The long-term vision is to move beyond:

Date → Event

toward:

Time
 │
 ├── Events
 ├── Periods
 ├── People
 ├── Places
 ├── Processes
 ├── Evidence
 ├── Relationships
 └── Change

The timeline becomes a navigable model of temporal knowledge.

37. Example Learning Flow

A history lesson might work like this:

                 Timeline
                    │
             learner explores
                    │
                    ▼
              selects 1857
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        GeoMap     Visual     Text
          │         │         │
       locations   images   explanation
          │
          ▼
       Chart
    population/data

The timeline becomes the temporal spine of the lesson.

38. Design Principles

The Timeline Engine SHALL follow these principles:

1. Time is a dimension

Time should be explorable, not merely displayed.

2. Sequence is not causality

Temporal order must not imply causal certainty.

3. Duration matters

The visual model should communicate both moments and spans.

4. Context matters

Events should be understood relative to surrounding events and periods.

5. Multiple perspectives

Parallel tracks should allow comparison.

6. Progressive complexity

Zoom and disclosure should reveal detail gradually.

7. Accessible by default

Temporal information must not depend solely on visual positioning.

8. Data and meaning remain separate

Rendering coordinates are never the source of truth.

9. Composable

Timeline should communicate with other OpenEdu engines.

10. Learner-centered

The goal is not:

"Show a beautiful timeline."

The goal is:

"Help the learner understand change through time."

39. Long-Term Vision

The OpenEdu Timeline Engine should evolve from:

Interactive timeline component

into:

Interactive temporal reasoning engine

Ultimately:

Time
 ↓
Explore
 ↓
Compare
 ↓
Connect
 ↓
Investigate
 ↓
Reason
 ↓
Understand

A timeline should allow learners to experience history, science, processes and change as something they can navigate and interrogate, rather than something they simply read.

40. Success Criteria

The Timeline Engine is successful when an OpenEdu author can express:

"Help the learner understand how these things changed over this period."

without writing timeline UI code.

And the learner can:

navigate → compare → connect → investigate → reason about time.
