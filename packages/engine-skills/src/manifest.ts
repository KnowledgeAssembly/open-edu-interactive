import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(MODULE_DIR, '..');

export interface ValidationContract {
  package: string;
  symbol: string;
  method: string;
}

export interface EngineSkillEntry {
  type: string;
  skill: string;
  kinds: string[];
  skillDoc: string;
  schema: string;
  example: string;
  validationContract: ValidationContract;
  namespacedEvents: string[];
}

export interface EngineSkillsManifest {
  package: string;
  version: string;
  schemaVersion: number;
  engines: EngineSkillEntry[];
}

export const MANIFEST_PATH = resolve(PACKAGE_ROOT, 'manifest.json');
export const MANIFEST: EngineSkillsManifest = JSON.parse(
  readFileSync(MANIFEST_PATH, 'utf8'),
);

export function getEngineEntry(type: string): EngineSkillEntry | undefined {
  return MANIFEST.engines.find((e) => e.type === type);
}

export function loadSkillDoc(type: string): string {
  const entry = getEngineEntry(type);
  if (!entry) {
    throw new Error(`Unknown engine type: ${type}`);
  }
  return readFileSync(resolve(PACKAGE_ROOT, entry.skillDoc), 'utf8');
}

export function loadSchema(type: string): unknown {
  const entry = getEngineEntry(type);
  if (!entry) {
    throw new Error(`Unknown engine type: ${type}`);
  }
  return JSON.parse(readFileSync(resolve(PACKAGE_ROOT, entry.schema), 'utf8'));
}

export function loadSkillExample(type: string): unknown {
  const entry = getEngineEntry(type);
  if (!entry) {
    throw new Error(`Unknown engine type: ${type}`);
  }
  return JSON.parse(readFileSync(resolve(PACKAGE_ROOT, entry.example), 'utf8'));
}