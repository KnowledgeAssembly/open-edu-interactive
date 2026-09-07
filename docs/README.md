# OpenEdu Interactive Engine — Documentation

Shared infrastructure for turning declarative JSON into interactive, accessible, educational learning experiences. Five engines, one contract.

**Start here:** [`DESIGN.md`](DESIGN.md) — the overall design, principles, and system-wide decisions (D1–D9).

## Document map

| Tier | Document | Content |
|------|----------|---------|
| Design | [`DESIGN.md`](DESIGN.md) | System-wide decisions, principles, contract of contracts. Canonical for new work. |
| Contract | [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md) | Shared architecture & semantic contract: vocabulary, actions, events, state, error model, spec hierarchy (top of §91 hierarchy). |
| Structure | [`STRUCTURE.md`](STRUCTURE.md) | Repository layout, package separation, tech stack, platform phases. Package naming per DESIGN D2. |
| Plan | [`PLAN.md`](PLAN.md) | Living implementation plan: exit-gated phases P0-P7, working model, status board. |
| Schema | [`schemas/interactive-engine.schema.json`](schemas/interactive-engine.schema.json) | Machine-readable envelope (`type`/`version`/`id`). |
| Composition | [`schemas/composition.schema.json`](schemas/composition.schema.json) | Lesson-level `{ engines[], bindings[] }` (P2.5). |

## Engines

| Engine | Reasoning space | Vision | Spec | Implementation |
|--------|-----------------|--------|------|----------------|
| Visual | Spatial / visual objects | — | [`engines/visual/SPEC.md`](engines/visual/SPEC.md) | [`ARCHITECTURE.md`](engines/visual/ARCHITECTURE.md) · [`COMPONENTS.md`](engines/visual/COMPONENTS.md) · [`PROJECT.md`](engines/visual/PROJECT.md) |
| GeoMap | Geographic / where | [`engines/geomap/VISION.md`](engines/geomap/VISION.md) | [`engines/geomap/SPEC.md`](engines/geomap/SPEC.md) | — |
| Chart | Quantitative / how much | [`engines/chart/VISION.md`](engines/chart/VISION.md) | [`engines/chart/SPEC.md`](engines/chart/SPEC.md) (thin) | — |
| Timeline | Temporal / when | [`engines/timeline/VISION.md`](engines/timeline/VISION.md) | [`engines/timeline/SPEC.md`](engines/timeline/SPEC.md) (thin) | — |
| Diagram | Structural / how connected | [`engines/diagram/VISION.md`](engines/diagram/VISION.md) | [`engines/diagram/SPEC.md`](engines/diagram/SPEC.md) (thin) | — |

Status key: **thin** = normative envelope + MVP slice only (gates P3–P6 code); expand in schemas/code, not unbounded vision prose. **GeoMap schema + agent tooling** = TODO.

## Status matrix

| Document | Status | Canonical? |
|----------|--------|-----------|
| DESIGN.md | Proposed | Yes — supersedes conflicting envelope/repo/phase/`purpose`/action/runtime/composition/visual-scope forms (see D1–D9) |
| CONTRACT → INTERACTIVE-ENGINE-SPEC.md | Draft | Yes for shared contract |
| STRUCTURE.md | Proposed | Yes for packaging/platform |
| engines/visual/SPEC.md | Proposed v1.0 | Yes (envelope per D1) |
| engines/visual/ARCHITECTURE.md | Proposed v0.1 | Architecture only; packaging per D2 |
| engines/visual/COMPONENTS.md | Proposed v1.0 | Yes |
| engines/visual/PROJECT.md | Proposed | Process/phases per D3 |
| engines/geomap/SPEC.md | v1.0.0 | Envelope per D1 |
| engines/geomap/VISION.md | Foundational | Context |
| engines/chart/SPEC.md | Proposed thin | Yes (envelope + P3 MVP) |
| engines/timeline/SPEC.md | Proposed thin | Yes (envelope + P5 MVP; P2.5 stub) |
| engines/diagram/SPEC.md | Proposed thin | Yes (envelope + P6 MVP) |
| engines/chart, timeline, diagram/VISION.md | Draft | Context only — non-normative |

## Conventions

- Specifications are declarative, renderer-independent JSON. Agents write specs, never SVG/HTML/pixels.
- Validation is layered: Schema → Semantic → Layout → Accessibility (see DESIGN §11).
- Engines are embedded in lessons as `{ "type": "interactive", "engine": "<type>", "spec": {…} }` (DESIGN §4 / shared contract §94); package structure per shared contract §90 and DESIGN D2.
- OpenEdu widgets remain as lightweight presentation primitives; engines are the semantic layer above them (shared contract §95-96).

For repo layout, phases, and tooling: [`STRUCTURE.md`](STRUCTURE.md). For the living implementation plan: [`PLAN.md`](PLAN.md).