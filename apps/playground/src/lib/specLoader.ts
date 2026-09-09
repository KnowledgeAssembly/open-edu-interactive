import { catalog, loadSpec } from "@knowledgeassemble/dev-harness";

export { loadSpec };

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

export function getEngineTypes(): readonly string[] {
  return ["visual", "chart", "geomap", "timeline", "diagram"] as const;
}
