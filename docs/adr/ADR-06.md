# ADR-06: OpenEdu Host Seam (D6)

**Status:** Accepted  
**Supersedes:** PLAN P7 "then reuse OpenEdu runtime" as a late surprise  
**DESIGN.md reference:** §16 D6  

## Context

Engines could embed OpenEdu infrastructure (telemetry, i18n, Studio) or remain host-agnostic.

## Decision

Engines emit D5 events + snapshot and consume `EngineHost`. OpenEdu owns workflow, scoring, Pipili, telemetry store, tokens, i18n, Studio, PWA. There is no second Interactive Studio or assessment engine in this repo.

## Consequences

+ Engines are framework-independent  
+ OpenEdu can upgrade its own services without engine changes  
+ Hard boundary prevents feature creep