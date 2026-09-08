# GeoMap Engine — Fixture Documentation

## Validation

All GeoMap specs in this directory MUST pass `GeoMapEngine.validate`.

```sh
pnpm --filter @knowledgeassemble/geomap-engine test
```

### Rules

1. Every spec round-trips `GeoMapEngine.validate` as `valid: true`.
2. No fixture contains authored geometry keys (`x`, `y`, `width`, `height`, `fill`, `stroke`).
3. No fixture invents geography — all entity locations trace to declared sources or coordinates.
4. Provenance: each source declares a `class` (`authoritative` | `illustrative` | `simulated`).

### Related schema files

- `docs/schemas/geomap-spec.schema.json` — L1 schema validation
- `docs/schemas/interactive-engine.schema.json` — shared envelope (embedded by geomap spec)

### Running validation locally

```sh
pnpm --filter @knowledgeassemble/geomap-engine typecheck
pnpm --filter @knowledgeassemble/geomap-engine lint
pnpm --filter @knowledgeassemble/geomap-engine test
```