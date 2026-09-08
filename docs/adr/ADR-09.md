# ADR-09: Visual Closed Component Set (D9)

**Status:** Accepted  
**Supersedes:** Visual PROJECT §8 items 8–11 (timeline, flowchart, label-diagram → Timeline/Diagram engines)  
**DESIGN.md reference:** §16 D9  

## Context

Visual engine scope could expand to include timeline, flowchart, and label-diagram components.

## Decision

Visual has a closed component set (7 math/general kinds). Timeline, flowchart, and label-diagram belong to Timeline and Diagram engines — not Visual. No engine smuggling.

## Consequences

+ Clear engine boundaries  
+ Prevents Visual from becoming a kitchen-sink engine  
+ Each engine focused on its educational domain  
+ Migration path: widgets move to their correct engine home