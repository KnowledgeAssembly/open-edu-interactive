const VAL_PREFIXES = [
  'packages/',
  'docs/',
];

export function loadSpec(specPath: string): unknown {
  if (!VAL_PREFIXES.some((p: string) => specPath.startsWith(p))) {
    throw new Error(`Invalid specPath: ${specPath}`);
  }
  return import(
    /* @vite-ignore */
    `../../../${specPath}`
  );
}