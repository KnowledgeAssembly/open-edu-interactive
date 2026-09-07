# Diagram Engine — Normative Specification (thin)

**File:** `docs/engines/diagram/SPEC.md`  
**Status:** Proposed (thin — gates P6 implementation; expand in code, not prose)  
**Version:** 1.0.0  
**Parent:** DESIGN D1 · shared contract · `engines/diagram/VISION.md` (non-normative)

---

## 1. Purpose

Normative surface for the Diagram Engine: structural reasoning (`how connected`). Replaces `science.label-diagram` and flowchart widgets over time (DESIGN §3, §95).

## 2. Envelope

```json
{
  "type": "diagram",
  "version": "1.0.0",
  "id": "water-cycle",
  "metadata": { "title": "Water cycle" },
  "purpose": {
    "learningObjective": "Understand how water moves through the cycle",
    "reasoningMode": "explore"
  },
  "content": {
    "kind": "cycle",
    "profile": "process",
    "nodes": [
      { "id": "evaporation", "label": "Evaporation" },
      { "id": "condensation", "label": "Condensation" },
      { "id": "precipitation", "label": "Precipitation" },
      { "id": "collection", "label": "Collection" }
    ],
    "edges": [
      { "from": "evaporation", "to": "condensation", "relationship": "leads-to" },
      { "from": "condensation", "to": "precipitation", "relationship": "leads-to" },
      { "from": "precipitation", "to": "collection", "relationship": "leads-to" },
      { "from": "collection", "to": "evaporation", "relationship": "leads-to" }
    ]
  },
  "layout": { "type": "radial" },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "focus", "expand", "collapse", "follow", "reset"]
  },
  "questions": [],
  "accessibility": {
    "label": "Water cycle diagram showing evaporation, condensation, precipitation, and collection"
  }
}
```

Rules:

- `type` MUST be `"diagram"`.
- Relationships are first-class (`relationship` on edges), not line styling (D5, `VISION.md` §10).
- `content.kind` / `profile` MVP: `flow` | `cycle` | `hierarchy` | `concept-map` (one engine, multiple profiles).
- Layout is semantic (`layout.type`); coordinates are derived (DESIGN §8).
- Auto-layout positions are **illustrative** unless provenance says otherwise (DESIGN §9).
- Emit `diagram.node-selected`, `diagram.relationship-followed`.

## 3. MVP slice (P6)

1. **Nodes / edges / auto-layout** with deterministic semantic behavior.
2. Cycle detection → clean layout; invalid references fail L2.
3. Structured relationship list as accessible alternative (L4).

## 4. Non-goals

Not a general diagramming IDE. Not causal claims without explicit `relationship` types.
