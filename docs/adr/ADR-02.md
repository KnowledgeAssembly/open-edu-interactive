# ADR-02: Package Structure & Namespace (D2)

**Status:** Accepted  
**Supersedes:** Visual ARCHITECTURE §41–42, Visual PROJECT §18, STRUCTURE §7 (pre-merge)  
**DESIGN.md reference:** §16 D2  

## Context

Engine packages could follow a standalone naming convention (`@knowledgeassemble/visual-engine`) or nest inside the host namespace.

## Decision

Packages are structured per the shared contract §90: `@knowledgeassemble/*` during development. OpenEdu renames to `@open-edu/*` on integration. Independent tree-shaking per package.

## Consequences

+ Clear ownership boundary  
+ Packages publishable independently  
+ Migration cost deferred to consuming repo