# Timeline fixtures

## `fixture/events/`
Minimal events-only slice — two events, no periods/tracks.

## `fixture/periods/`
Events with period bands — two periods spanning the event range.

## `fixture/tracks/`
Events with track lanes — two events on one named track, one on the default lane.

## `fixture/independence/`
Full integrated slice — 7 events, 2 periods, 2 tracks, sources, accessibility. Used by the conformance app.

## Validation
All fixtures must pass `TimelineEngine.validate` (L1–L4) on their `input.timeline.json`.
No fixture contains `x`, `y`, `pixel`, or `width` geometry — all positions are derived layout.
Every fixture carries `sources[]` and `accessibility.label` (enforced at L2/L4).