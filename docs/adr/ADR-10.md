# ADR-10: GeoMap deterministic geo-math exception (d3-geo)

**Status:** Accepted  
**Supersedes:** PLAN-P8 §0 "no D3/d3-geo until Workstream A is green" (partial)  
**DESIGN.md reference:** P4 (deterministic), §6 D2 (package isolation)

## Context

PLAN-P8 §0 non-goals ban d3-geo until Workstream A is green. Meanwhile the GeoMap engine already ships `d3-geo` (`d3-geo@^3.1.1`, `@types/d3-geo`) as a production dependency and uses it in `packages/geomap-engine/src/geo.ts` for `geoCentroid`, `geoArea`, `geoDistance`, `geoInterpolate`, and `geoPath`. The doc-vs-code contradiction was surfaced by the 2026-09-13 architecture review.

## Decision

`d3-geo` is an accepted, documented exception for the GeoMap engine only:

- it provides **deterministic spherical math** (P4: identical input → identical output; no randomness in any function used);
- it is consumed only behind the `src/geo.ts` module boundary — never in scene/layout/render code paths that touch the spec surface;
- no other D3 (d3-scale, d3-time, d3-selection/DOM), ELK, Dagre, Recharts, or MapLibre may be introduced;
- the exception is re-reviewed when Workstream A is green.

## Consequences

+ Documentation debt resolved: PLAN-P8 §0 now names the exception with this ADR reference.
+ No other engine may adopt D3; Chart/Timeline/Diagram/Visual remain library-free for geometry.
+ GeoMap retains a compact, deterministic math implementation without hand-rolling spherical projection.
- GeoMap's package carries one production dependency that other engines do not share (cost is contained to one engine).