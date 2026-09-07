# Composition

Cross-engine composition runtime (P2.5, D8). Routes namespaced result events from one engine instance to D5 semantic actions on another.

## API

- `Lesson.load(input, registry)` — validates a lesson definition against the composition schema; throws `INVALID_SPEC` for structural issues, unmatched `engine !== spec.type`, L1 validation failures on embedded engine specs, bindings that do not declare exactly one of `targetIdFrom`/`targetId`, or a binding dispatching an action the target does not declare in `interaction.actions` (`INVALID_ACTION`). Bindings referencing an unknown target instance throw `INVALID_REFERENCE`.
- `lesson.start(host)` — instantiates each engine via `EngineRegistry`, wires bindings via `Router`, returns a `LessonRuntime` with `dispatch(instanceId, action)`, `snapshot(instanceId)`, `events()`, and `stop()`.
- `Router` — subscribes to source engine instances; matching events are enqueued, then `Router.run()` resolves each target id from `targetIdFrom` (dot-path on the event payload) or `targetId` and dispatches the configured D5 action to the target instance.

## Routing semantics

`Router.start()` only subscribes; resolution and dispatch happen in `Router.run()`, which `LessonRuntime.dispatch()` drains synchronously after the source engine's dispatch returns. Consequences:

- The source engine's event stream (including `interaction-completed`) always completes, even when a binding later fails.
- A routing failure — e.g. an `targetIdFrom` path that does not resolve on the payload — throws `INVALID_REFERENCE` from the *calling* `dispatch()`, never from inside the source engine's emit.
- Cascading bindings (a routed dispatch that itself triggers a matching event) stay in a single synchronous `run()` drain, so event ordering remains deterministic for identical input.

## Determinism

All events flow through a shared `EventLog` with global monotonic seq. The `events()` list is serializable and replayable. Identical input + identical dispatch sequence → identical output.

## Error codes

Shared `ERROR_CODES` only: `INVALID_SPEC`, `INVALID_REFERENCE`, `INVALID_ENTITY`, `INVALID_ACTION`, `UNSUPPORTED_ACTION`, `INVALID_STATE`, `ACCESSIBILITY_ERROR`. No bespoke codes.
