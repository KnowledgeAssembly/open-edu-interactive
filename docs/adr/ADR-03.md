# ADR-03: Platform-First Program Sequence (D3)

**Status:** Accepted  
**Supersedes:** STRUCTURE §49 (program sequence), Visual PROJECT §Phases  
**DESIGN.md reference:** §16 D3  

## Context

Two competing phase plans existed: STRUCTURE §49 (platform → engines) and Visual PROJECT (standalone engine sequence).

## Decision

Adopt the STRUCTURE sequence at the program level (platform first, then per-engine cycles) and the Visual sequence as the per-engine lifecycle shape (Spec → Schema → Scene → Layout → Render → Validation → Fixtures).

## Consequences

+ Shared runtime contracts before engine-specific work  
+ Consistent engine lifecycle  
- Delays first engine visualization behind platform work