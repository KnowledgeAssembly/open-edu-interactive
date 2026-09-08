# ADR-07: Assessment Seam (D7)

**Status:** Accepted  
**Prevents:** Dual quiz systems (F6)  
**DESIGN.md reference:** §16 D7  

## Context

Engines could include scoring and hints, or defer to OpenEdu's quiz infrastructure.

## Decision

Envelope `questions` / `completion` are hints for authoring and AI. OpenEdu owns scoring, feedback, hints, and progression. Engines MUST NOT require envelope questions to function.

## Consequences

+ No scoring duplication  
+ AI agents can still attach prompts to specs  
+ Engines work correctly with empty `questions` array