import { catalog } from "@knowledgeassemble/dev-harness";
import { catalogPathFromGlobKey, unwrapSpecModule } from "./specPaths.js";

const engineGlob = import.meta.glob(
  "../../../../packages/*/fixture/**/input.*.json",
  { eager: true }
);

const docsGlob = import.meta.glob(
  "../../../../docs/fixtures/**/*.json",
  { eager: true }
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

export interface FixtureEntry {
  id: string;
  kind: "engine" | "lesson" | "composition";
  engine?: string;
  slug: string;
  specPath: string;
  title?: string;
  golden?: Record<string, string>;
}

export function getCatalog(): FixtureEntry[] {
  return catalog as unknown as FixtureEntry[];
}

export function loadSpec(specPath: string): unknown {
  const spec = specByPath.get(specPath);
  if (!spec) throw new Error(`Spec not found: ${specPath}`);
  return spec;
}

export function getEngineTypes(): readonly string[] {
  return ["visual", "chart", "geomap", "timeline", "diagram"] as const;
}
