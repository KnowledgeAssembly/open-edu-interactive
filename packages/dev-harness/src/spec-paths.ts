const GLOB_PREFIX = '../../../';

export function catalogPathFromGlobKey(globKey: string): string | null {
  if (globKey.startsWith('../../../docs/')) {
    return globKey.slice('../../../'.length);
  }
  if (globKey.startsWith('../../') && globKey.includes('-engine/')) {
    return `packages/${globKey.slice('../../'.length)}`;
  }
  if (globKey.startsWith(GLOB_PREFIX)) {
    return globKey.slice(GLOB_PREFIX.length);
  }
  return null;
}

export function unwrapSpecModule(mod: unknown): unknown {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}
