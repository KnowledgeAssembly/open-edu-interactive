import { catalog } from "@knowledgeassemble/dev-harness";

const engineGlob = import.meta.glob(
  "../../../packages/*/fixture/**/input.*.json",
  { eager: true }
);

const docsGlob = import.meta.glob(
  "../../../docs/fixtures/**/*.json",
  { eager: true }
);

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

function findSpec(specPath: string): unknown {
  const engineKey = `/${specPath}`;
  if (engineKey in engineGlob) return (engineGlob as Record<string, unknown>)[engineKey];
  if (engineKey in docsGlob) return (docsGlob as Record<string, unknown>)[engineKey];
  const docsKey = `../../../${specPath}`;
  if (docsKey in docsGlob) return (docsGlob as Record<string, unknown>)[docsKey];
  return undefined;
}

export function loadSpec(specPath: string): unknown {
  const spec = findSpec(specPath);
  if (!spec) throw new Error(`Spec not found: ${specPath}`);
  return spec;
}

export function getEngineTypes(): readonly string[] {
  return ["visual", "chart", "geomap", "timeline", "diagram"] as const;
}