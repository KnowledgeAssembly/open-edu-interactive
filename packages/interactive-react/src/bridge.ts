import type { EngineEvent, EngineHost } from '@knowledgeassemble/interactive-engine';

export interface OpenEduBridge {
  locale: string;
  tokens: Record<string, string>;
  reducedMotion: boolean;
  t(key: string, vars?: Record<string, string | number>): string;
  announce(message: string): void;
  onEvent(event: { seq: number; name: string; instanceId: string; action?: unknown }): void;
  resolveAsset(id: string): string | Uint8Array;
}

export function bridgeToHost(bridge: OpenEduBridge): EngineHost {
  const originalAnnounce = bridge.announce;
  return {
    locale: bridge.locale,
    tokens: bridge.tokens,
    reducedMotion: bridge.reducedMotion,
    announce(message: string): void {
      originalAnnounce(message);
    },
    onEvent(event: EngineEvent): void {
      bridge.onEvent(event);
    },
    resolveAsset(id: string): string | Uint8Array {
      return bridge.resolveAsset(id);
    },
  };
}