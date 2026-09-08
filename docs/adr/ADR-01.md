# ADR-01: Engine-Specification Envelope (D1)

**Status:** Accepted  
**Supersedes:** GeoMap §7, Visual §7 envelope forms  
**DESIGN.md reference:** §16 D1  

## Context

Engine specifications originally used a variety of shapes (`schemaVersion`, `{ "geomap": {} }` wrappers). This created inconsistency across engines.

## Decision

Adopt a single envelope `{ type, version, id, purpose?, content?, interaction?, ... }`. All engine specs use this shared shape embedded in lessons as `{ "type": "interactive", "engine", "spec" }`.

## Consequences

+ Consistent spec authoring across engines  
+ No migration burden when adding new engines  
- Existing documents referencing split forms are superseded