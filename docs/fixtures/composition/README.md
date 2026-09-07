# Composition fixtures

**Status:** Normative examples (DESIGN D8)  
**Audience:** P2.5 conformance harness, lesson authors, AI agents

These files describe **lesson-level** composition: multiple engine instances plus event→action bindings. They are not engine specifications and do not validate against `interactive-engine.schema.json` alone.

The product differentiator vs widgets is cross-engine reasoning (e.g. a timeline selection driving a visual focus). P2.5 proves the bus before building Chart, GeoMap, Timeline, and Diagram renderers in full.

## Files

| File | Pattern |
|------|---------|
| `narrative-timeline-visual.json` | Timeline `event-selected` → Visual `focus` (minimal two-engine lesson) |

## Rules (D5, D6, D8)

- Bindings reference **namespaced events** (`timeline.event-selected`) and **D5 actions** (`focus`, `select`, …).
- Engines do not import each other; the lesson runtime (or harness) routes events.
- Scoring, hints, and quiz nodes remain OpenEdu-owned (D7). Fixtures may include empty `questions` on engine specs.
