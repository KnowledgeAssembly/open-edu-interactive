# Composition fixtures

**Status:** Normative (P2.5) — validates against `schemas/composition.schema.json` (DESIGN D8)  
**Audience:** P2.5 conformance harness, lesson authors, AI agents

These files describe **lesson-level** composition: multiple engine instances plus event→action bindings. They validate against `docs/schemas/composition.schema.json`. Embedded engine `spec` objects MUST also pass L1 on `interactive-engine.schema.json`.

The product differentiator vs widgets is cross-engine reasoning (e.g. a timeline selection driving a visual focus). P2.5 proves the bus before building Chart, GeoMap, Timeline, and Diagram renderers in full.

## Files

| File | Pattern | Schema |
|------|---------|--------|
| `narrative-timeline-visual.json` | Timeline `event-selected` → Visual `focus` (minimal two-engine lesson) | `composition.schema.json` |

## Rules (D5, D6, D8)

- Bindings reference **namespaced events** (`timeline.event-selected`) and **D5 actions** (`focus`, `select`, …).
- Engines do not import each other; the lesson runtime (or harness) routes events.
- Scoring, hints, and quiz nodes remain OpenEdu-owned (D7). Fixtures may include empty `questions` on engine specs.

## Validation

```bash
# Composition envelope (L1)
validate composition.schema.json against narrative-timeline-visual.json

# Embedded engine specs (L1)
validate interactive-engine.schema.json against each engines[].spec
```
