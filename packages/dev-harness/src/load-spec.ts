import { catalogPathFromGlobKey, unwrapSpecModule } from './spec-paths.js';

const engineGlob = import.meta.glob(
  '../../../packages/**/fixture/**/input.*.json',
  { eager: true },
);

const docsGlob = import.meta.glob(
  '../../../docs/fixtures/**/*.json',
  { eager: true },
);

const specByPath = new Map<string, unknown>();

for (const [globKey, mod] of Object.entries(engineGlob)) {
  const path = catalogPathFromGlobKey(globKey);
  if (path) specByPath.set(path, unwrapSpecModule(mod));
}

for (const [globKey, mod] of Object.entries(docsGlob)) {
  const path = catalogPathFromGlobKey(globKey);
  if (path) specByPath.set(path, unwrapSpecModule(mod));
}

export function loadSpec(specPath: string): unknown {
  const spec = specByPath.get(specPath);
  if (!spec) throw new Error(`Spec not found: ${specPath}`);
  return spec;
}
