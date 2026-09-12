# @knowledgeassemble/engine-skills

Authoring skills for the OpenEdu Interactive engines, packaged for consumers.

## Source of truth

Everything under `skills/` is a **generated/committed projection**. Never hand-edit it.

- The authorable copy lives in-repo: `docs/engines/<engine>/skills/<skill>/SKILL.md` (prose, may reference in-repo docs) and `docs/fixtures/<engine>/skill-example.json` (machine input). Engine schemas and `docs/schemas/composition.schema.json` complete the inputs.
- Edit those, run `pnpm generate`, and commit both sides. The freshness guard
  (`scripts/check-engine-skills-fresh.mjs`) fails if regeneration produces a diff.
- Generated artifacts must contain **zero** `packages/` or `docs/` path fragments; the
  generator fails loudly otherwise. Composition's embedded-spec line says
  `validateEnvelope(spec)` from `@knowledgeassemble/interactive-engine` — `./schema.json`
  is the lesson schema, not the envelope.

## Layout

Each skill is a folder under `skills/` containing:

- `SKILL.md` — instructions for a course authoring agent (what the interactive means, `content` shape, acceptance criteria).
- `schema.json` — the full envelope JSON Schema (draft 2020-12) for that engine.
- `skill-example.json` — a valid, self-contained example spec.

`manifest.json` maps each engine to its skill folder, example, schema, and the
`validationContract` (`package` / `symbol` / `method`) used to validate specs at
runtime.

## Consuming

```ts
import { getValidationContract, loadSkillExample, validateSkillExample, validateSpec } from '@knowledgeassemble/engine-skills';

const contract = getValidationContract('visual'); // { package, symbol, method }
validateSkillExample('visual');                   // { valid: true, errors: [] }
validateSpec('visual', mySpec);                   // validates any candidate spec
```

## Development

| Task | Command |
|------|---------|
| regenerate skills/schema/manifest from source docs | `pnpm generate` |
| typecheck | `pnpm typecheck` |
| lint | `pnpm lint` |
| tests | `pnpm test` |

Generated artifacts are committed; regeneration must produce a byte-identical
tree, enforced by `node scripts/check-engine-skills-fresh.mjs` (repo root).