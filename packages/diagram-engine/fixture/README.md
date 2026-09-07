# Fixtures for Diagram Engine

This directory contains golden fixtures for the Diagram Engine.

## Structure

- `flow/` — minimal acyclic flow slice (hierarchical layout)
- `cycle/` — minimal directed cycle slice (radial layout)
- `hierarchy/` — minimal hierarchy with `contains`/`part-of` edges
- `concept-map/` — minimal concept-map slice (grid layout)
- `water-cycle/` — integrated cycle example used by conformance

Each fixture has:
- `input.diagram.json` — the spec under test
- `validation.json` — expected validation result from `DiagramEngine.validate`

`expected.*.json` artifacts are produced by the conformance pipeline and asserted byte-stable by snapshot tests (`test/fixture.test.ts`), including `positionSource: 'illustrative'` on every laid-out node.

## Validation

```sh
pnpm --filter @knowledgeassemble/diagram-engine test fixture
```