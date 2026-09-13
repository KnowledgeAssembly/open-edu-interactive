# ADR-10: GeoMap deterministic geo-math exception (d3-geo)

**Status:** Accepted  
**Supersedes:** PLAN-P8 §0 "no D3/d3-geo until Workstream A is green" (partial)  
**DESIGN.md reference:** P4 (deterministic), §6 D2 (package isolation)

## Context

PLAN-P8 §0 non-goals ban d3-geo until Workstream A is green. Meanwhile the GeoMap engine already ships `d3-geo` (`d3-geo@^3.1.1`, `@types/d3-geo`) as a production dependency. The doc-vs-code contradiction was surfaced by the 2026-09-13 architecture review.

The initial review draft claimed d3-geo was "isolated behind `src/geo.ts`" (a module that does not exist) and listed `geoInterpolate`/`geoPath` as used functions (they are not). The verified usage, per-import, is:

- `packages/geomap-engine/src/layout/projection.ts` — `geoEquirectangular`, `geoMercator`, `geoAlbers` (projection constructors);
- `packages/geomap-engine/src/scene/build.ts` — `geoCentroid`, `geoArea` (region centroid / reversal detection);
- `packages/geomap-engine/src/scene/derive.ts` — `geoDistance` (radial scale calibration).

There is no `src/geo.ts` facade: d3-geo is imported directly by scene/layout modules. The isolation claim in this ADR therefore means **semantic isolation** (pure math only), not a module boundary.

## Decision

`d3-geo` is an accepted, documented exception for the GeoMap engine only:

- it provides **deterministic spherical math** (P4: identical input → identical output; no randomness in any function used);
- every call site is a **pure-math transform** — projection constructors, centroid/area, distance — with no DOM access, no event handling, and no spec-surface coupling; none of the imported symbols touch the spec/envelope surface;
- `d3-geo` must never appear in `render/` or `validation/` paths, and no D3 module beyond the pure-math surface (no d3-scale, d3-time, d3-selection/DOM) may be introduced;
- the exception is re-reviewed when Workstream A is green.

## Consequences

+ Documentation debt resolved: PLAN-P8 §0 now names the exception with this ADR reference.
+ No other engine may adopt D3; Chart/Timeline/Diagram/Visual remain library-free for geometry.
+ GeoMap retains a compact, deterministic math implementation without hand-rolling spherical projection.
- GeoMap's package carries one production dependency that other engines do not share (cost is contained to one engine).