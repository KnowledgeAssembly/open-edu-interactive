# ADR-12: `interaction.actions` is an authoring declaration, not a runtime access-control list

**Status:** Accepted  
**DESIGN.md reference:** §7.4 (D5), §11 (validation layers), §16 D5

## Context

`interaction.actions` is currently:

- validated at L2 semantic validation in all five engines — every entry MUST be a member of the D5 set (`INVALID_ACTION` otherwise);
- checked at composition load (`Lesson.load`) — a binding may only dispatch an action the target declares;

but is **not enforced at dispatch runtime** — `baseReducer` accepts any D5 action regardless of the declared set. The 2026-09-13 architecture review asked whether this is a gap.

## Decision

`interaction.actions` is an **authoring-level contract** describing what the author intends to be interactive. Enforcement happens:

1. at validation time (declared set MUST be ⊆ D5), and
2. at composition binding time (bindings MUST declare their dispatched action).

The D5 reducer's closed enum is the only runtime boundary; the host may programmatically dispatch D5 actions the author did not declare (e.g. a lesson-level `reset` control, telemetry-driven `jump-to`). Enforcing the declared set at runtime would break legitimate host-driven dispatch and would be an access-control concern that belongs to the host, not the engine (D6).

If runtime enforcement of the declared subset is ever required, it belongs as an opt-in per-engine behavior, not a core reducer rule.

## Consequences

+ Clear, documented semantics: L2/validation + composition load are the gates; the runtime stays closed-enum.
+ Hosts keep full flexibility to drive engines programmatically.
- An author cannot rely on the engine rejecting an undeclared D5 action — validation tooling (not the runtime) is where that guarantee lives.