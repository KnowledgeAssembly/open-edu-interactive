import type { EngineEvent } from './event.js';

export interface EngineHost {
  locale: string;
  tokens: Record<string, string>;
  reducedMotion: boolean;
  announce(message: string): void;
  onEvent(event: EngineEvent): void;
  resolveAsset(id: string): string | Uint8Array;
}
