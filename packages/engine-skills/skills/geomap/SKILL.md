# Geographic Map — GeoMap Engine Skill

## When to use

GeoMap is for **geographic reasoning** — teaching *where* and *why there*. Use it when the educational goal requires:

- Identifying places, regions, or boundaries
- Understanding spatial relationships (proximity, adjacency, containment)
- Tracing routes or connections
- Locating features on a map
- Exploring geographic distributions

## When NOT to use

- **Quantitative comparisons** → use the Chart engine (bar/line)
- **Temporal sequences** → use the Timeline engine
- **Structural/relational diagrams** → use the Diagram engine
- **Static spatial manipulation** (number-line, fraction, clock) → use the Visual engine

## Contract

- Describe **semantic geography**: entities, layers, GeoJSON sources. Never author pixels or coordinates directly.
- `projection.type` MUST be `"equirectangular"` (P4 closed set).
- `viewport.fit` is `"content"` — the engine derives bounds from all data. Use `center`/`zoom` for explicit framing.
- Every entity MUST carry a `location` — either `{ source, featureId }` referencing a declared GeoJSON feature, or `{ coordinates: { lat, lon } }`.
- `entities[].type` is a closed enum. Choose from: `country`, `state`, `province`, `region`, `city`, `town`, `village`, `river`, `lake`, `mountain`, `landmark`, `place`.
- Layer types are closed: `region`, `marker`, `route`, `label`. Routes require ≥ 2 distinct point entities in `path`.
- Provenance: every source carries a `class`: `authoritative` | `illustrative` | `simulated`.
- **Never invent boundaries, values, or coordinates.** Every plotted geography traces to a declared GeoJSON source or explicit coordinates.
- **Do not author pixels.** No `x`, `y`, `width`, `height`, `fill`, `stroke` at the spec surface.
- Styling: use `style.role` with a closed token set (`primary-region`, `secondary-region`, `marker`, `route`, `label`, `highlight`, `selected`, `approximate`).
- Interactions: D5 semantic actions only (`select`, `deselect`, `focus`, `filter`, `clear-filter`, `reset`). No `click`/`hover`/`highlight` in specs.
- The SVG is a compiled artifact. The canonical outputs are the semantic scene, a11y tree, and alternative entity list.
- `accessibility.label` is required. Every interactive entity must have a non-empty `aria-label`.
- The alternative list (entity table/list) must cover every entity — nothing conveyed by color alone.

## Example

See `./skill-example.json`.

## Validation

```sh
# Validate a spec
runtime validation is via the manifest `validationContract` (install `package`, import `symbol`, call `method(spec)`)
```

Always validate before publishing. The engine rejects invented boundaries, invalid coordinates, unresolved references, and missing accessibility labels.
