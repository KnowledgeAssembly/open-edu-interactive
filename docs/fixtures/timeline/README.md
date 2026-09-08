# Timeline fixtures

## Schema validation

All timeline fixtures validate against `docs/schemas/timeline-spec.schema.json` (L1) and pass `TimelineEngine.validate` (L2–L4).

### Commands

```bash
pnpm --filter @knowledgeassemble/timeline-engine test
```

This runs all fixture round-trip tests in `packages/timeline-engine/test/fixture.test.ts`.

## Rules

- No fixture contains `x`, `y`, `pixel`, or `width` — geometry is derived layout.
- Every fixture carries `sources[]` (provenance, DESIGN §9).
- Every fixture carries `accessibility.label` (L4).
- Dates follow Timeline-D3 grammar: `^[+-]?\d{1,6}(-\d{2}){0,2}$`.
- Event `id` values are stable selection targets.
- `links.*` are composition hints only.

## Fixture files

| Directory | Description |
|-----------|-------------|
| `skill-example.json` | Canonical authoring example for the temporal-timeline skill. Events + periods + tracks. |
| `packages/timeline-engine/fixture/events/` | Minimal events-only slice |
| `packages/timeline-engine/fixture/periods/` | Events with period bands |
| `packages/timeline-engine/fixture/tracks/` | Events with track lanes |
| `packages/timeline-engine/fixture/independence/` | Full integrated slice for conformance |