# Diagram fixtures

**Status:** Normative (P6)

These are lesson-level diagram fixtures. They validate against `docs/schemas/diagram-spec.schema.json`; embedded specs pass `DiagramEngine.validate` (L1 envelope + L2–L4).

## Files

| File | Kind | Notes |
|------|------|-------|
| `skill-example.json` | `flow` | Canonical example from the structural-diagram authoring skill; round-trips `DiagramEngine.validate` |

## Rules

- `relationship` is REQUIRED on every edge and never inferred from adjacency.
- Layout is a strategy selector (`radial | hierarchical | grid`) — never coordinates.
- Auto-layout positions are `illustrative` provenance (DESIGN §9).
- Do not invent nodes, edges, or relationships; `questions` stay empty (D7).

## Validation

```bash
# Diagram content
validate docs/schemas/diagram-spec.schema.json against docs/fixtures/diagram/skill-example.json

# Embedded engine spec (L1 envelope)
validate docs/schemas/interactive-engine.schema.json against the same
```

Runtime round-trip: `pnpm --filter @knowledgeassemble/diagram-engine test skill-example` if such a test exists, else `test/fixture.test.ts` covers fixtures under `packages/diagram-engine/fixture/`.