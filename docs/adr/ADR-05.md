# ADR-05: D5 Semantic Action Enum (D5)

**Status:** Accepted  
**Supersedes:** `highlight` / `annotate` / `blur` / `play` / `show` (superseded)  
**DESIGN.md reference:** §16 D5  

## Context

Specs and dispatch() could use renderer input events (`click`, `pointer.*`) or semantic verbs like `highlight`.

## Decision

One closed semantic action enum (`$defs.actionType`): `select`, `deselect`, `focus`, `unfocus`, `filter`, ... Renderer input (`click`, `pointer.*`, `keyboard`) is mapped outside the spec. `highlight`, `annotate`, `blur`, `play`, `show` are banned.

## Consequences

+ Engine-agnostic interaction model  
+ Replayable event log (no renderer-dependent events)  
+ Migration needed for specs using superseded names