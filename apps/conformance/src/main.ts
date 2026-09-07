import { a11yTreeOf, createPlatformInstance } from '@knowledgeassemble/interactive-engine';
import type { EngineAction, EngineSpec } from '@knowledgeassemble/interactive-engine';

const SPEC: EngineSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-conformance',
  metadata: { title: 'Number Line' },
  purpose: { learningObjective: 'Select the highlighted value on the number line' },
  interaction: { actions: ['select', 'focus', 'reset'] },
  content: {},
};

interface HarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
}

declare global {
  interface Window {
    __harness?: HarnessRemote;
  }
}

const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
const host = {
  locale: 'en',
  tokens: {},
  reducedMotion: false,
  announce: (message: string) => console.log('[announce]', message),
  onEvent: (event: { seq: number; name: string; action?: unknown }) => {
    emitted.push({ seq: event.seq, name: event.name, action: event.action });
  },
  resolveAsset: (id: string) => id,
};

const instance = createPlatformInstance(SPEC, host);
const t0 = a11yTreeOf(instance.snapshot());

const app = document.getElementById('app');
if (!app) {
  throw new Error('conformance: missing #app element');
}

const rootEl = document.createElement('div');
rootEl.id = t0.id;
rootEl.setAttribute('role', t0.role);
rootEl.setAttribute('aria-label', t0.label ?? t0.id);
rootEl.textContent = 'Number line conformance scene';
app.appendChild(rootEl);

window.__harness = {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void {
    instance.dispatch(action as EngineAction);
  },
  snapshot(): unknown {
    return instance.snapshot();
  },
  events() {
    return [...emitted];
  },
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
    try {
      const created = createPlatformInstance(spec as EngineSpec, host);
      created.teardown();
      return { ok: true };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      return { ok: false, code: err.code, message: err.message };
    }
  },
};