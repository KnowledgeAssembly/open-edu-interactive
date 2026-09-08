import { catalog } from "@knowledgeassemble/dev-harness";

const engineGlob = import.meta.glob(
  "../../../packages/*/fixture/**/input.*.json",
  { eager: true }
);

const docsGlob = import.meta.glob(
  "../../../docs/fixtures/**/*.json",
  { eager: true }
);

const ENGINE_KEY_PREFIX = "../../../packages/";
const DOCS_KEY_PREFIX = "../../../docs/fixtures/";

function normalizeEngineKey(key: string): string | null {
  if (key.startsWith(ENGINE_KEY_PREFIX)) return key.slice(ENGINE_KEY_PREFIX.length);
  return null;
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

function findSpec(specPath: string): unknown {
  const engineKey = normalizeEngineKey(specPath);
  if (engineKey && engineKey in engineGlob) return (engineGlob as Record<string, unknown>)[engineKey];
  if (specPath.startsWith("docs/fixtures/") && specPath in docsGlob) return (docsGlob as Record<string, unknown>)[specPath];
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