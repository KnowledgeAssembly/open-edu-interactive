# Composition

Cross-engine composition runtime (P2.5, D8). Routes namespaced result events from one engine instance to D5 semantic actions on another.

## API

- `Lesson.load(input, registry)` — validates a lesson definition against the composition schema; throws `INVALID_SPEC` for structural issues, unmatched `engine !== spec.type`, or L1 validation failures on embedded engine specs.
- `lesson.start(host)` — instantiates each engine via `EngineRegistry`, wires bindings via `Router`, returns a `LessonRuntime` with `dispatch(instanceId, action)`, `snapshot(instanceId)`, `events()`, and `stop()`.
- `Router` — subscribes to source engine instances; on matching namespaced event, resolves target id from `targetIdFrom` (dot-path on payload) or `targetId` and dispatches the configured D5 action to the target instance.

## Determinism

All events flow through a shared `EventLog` with global monotonic seq. The `events()` list is serializable and replayable. Identical input + identical dispatch sequence → identical output.

## Error codes

Shared `ERROR_CODES` only: `INVALID_SPEC`, `INVALID_REFERENCE`, `INVALID_ENTITY`, `INVALID_ACTION`, `UNSUPPORTED_ACTION`, `INVALID_STATE`, `ACCESSIBILITY_ERROR`. No bespoke codes.