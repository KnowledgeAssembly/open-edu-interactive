# ADR-08: Composition Proof at P2.5 (D8)

**Status:** Accepted  
**Prevents:** Waiting until P7 for cross-engine behavior (F5)  
**DESIGN.md reference:** §16 D8  

## Context

Cross-engine composition (timeline → visual focus) could wait until P7 integration or be proven early.

## Decision

Composition proof at P2.5 (after Visual). Fixture: `docs/fixtures/composition/narrative-timeline-visual.json`. The shared event bus routes namespaced events between instances without engine-to-engine imports.

## Consequences

+ Cross-engine architecture validated before full engine fleet  
+ P7 integration reuses the proven Lesson/Router model  
+ Additional composition patterns can be added incrementally