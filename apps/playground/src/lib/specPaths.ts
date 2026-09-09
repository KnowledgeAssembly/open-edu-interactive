const GLOB_PREFIX = "../../../../";

export function globKeyForCatalogPath(specPath: string): string {
  return `${GLOB_PREFIX}${specPath}`;
}

export function catalogPathFromGlobKey(globKey: string): string | null {
  if (globKey.startsWith(GLOB_PREFIX)) return globKey.slice(GLOB_PREFIX.length);
  return null;
}

export function unwrapSpecModule(mod: unknown): unknown {
  if (mod && typeof mod === "object" && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

export function encodeSpecHash(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `#spec=${btoa(binary)}`;
}

export function decodeSpecHash(hash: string): string {
  if (!hash.startsWith("#spec=")) throw new Error("Invalid spec hash");
  const encoded = hash.slice(6);
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
