# ADR-04: Purpose Schema (D4)

**Status:** Accepted  
**Supersedes:** `purpose.skill` / `purpose.statement` (superseded)  
**DESIGN.md reference:** §16 D4  

## Context

The envelope `purpose` field could reference skills, statements, or arbitrary identifiers.

## Decision

`purpose` is `$defs.purpose` in `interactive-engine.schema.json`: `learningObjective` (required), `interactionGoal`, `reasoningMode`. No `skill` / `statement` forms.

## Consequences

+ Clear educational intent in every spec  
+ AI agents can map learning objectives to interactions  
- Existing specs with `skill` must be migrated