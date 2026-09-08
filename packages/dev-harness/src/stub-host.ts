import type { EngineHost } from '@knowledgeassemble/interactive-engine';
import type { OpenEduBridge } from '@knowledgeassemble/interactive-react';
import type { StubHostOptions } from './types.js';

const MAX_EVENTS = 200;

export type { StubHostOptions } from './types.js';

export function createStubHost(opts?: StubHostOptions) {
  const emitted: Array<{ seq: number; name: string; instanceId: string; action?: unknown }> = [];

  const bridge: OpenEduBridge = {
    locale: opts?.locale ?? 'en',
    tokens: opts?.tokens ?? {},
    reducedMotion: opts?.reducedMotion ?? false,
    t(key: string): string {
      return key;
    },
    announce(message: string): void {
      opts?.onAnnounce?.(message);
    },
    onEvent(event: { seq: number; name: string; instanceId: string; action?: unknown }): void {
      if (emitted.length < MAX_EVENTS) {
        emitted.push(event);
      }
      opts?.onEvent?.(event);
    },
    resolveAsset(id: string): string | Uint8Array {
      return id;
    },
  };

  const host: EngineHost = {
    ...bridge,
    onEvent(event): void {
      if (emitted.length < MAX_EVENTS) {
        emitted.push({ seq: event.seq, name: event.name, instanceId: event.id, action: event.action });
      }
      opts?.onEvent?.({ seq: event.seq, name: event.name, instanceId: event.id, action: event.action });
    },
  };

  return {
    host,
    bridge,
    events(): readonly typeof emitted[number][] {
      return [...emitted];
    },
    clearEvents(): void {
      emitted.length = 0;
    },
  };
}