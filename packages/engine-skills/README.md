# @knowledgeassemble/engine-skills

Authoring skills for the OpenEdu Interactive engines, packaged for consumers.

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
tree (guarded by `scripts/check-engine-skills-fresh.mjs` via `pnpm fresh`).