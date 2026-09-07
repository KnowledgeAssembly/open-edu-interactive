import { a11yTreeOf } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import type { EngineAction, EngineSpec } from '@knowledgeassemble/interactive-engine';

const NL_SPEC: EngineSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-conformance',
  metadata: { title: 'Number Line' },
  purpose: { learningObjective: 'Select the highlighted value on the number line' },
  interaction: { actions: ['select', 'focus', 'reset'] },
  content: {
    kind: 'number-line',
    components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
  },
  accessibility: { label: 'Number line from 0 to 10', description: '7 is highlighted' },
};

interface HarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
  svg(): string;
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
    if (emitted.length < 100) {
      emitted.push({ seq: event.seq, name: event.name, action: event.action });
    }
  },
  resolveAsset: (_id: string) => '',
};

const engine = new VisualEngine();
const instance = engine.instantiate(NL_SPEC, host);
const t0 = a11yTreeOf(instance.snapshot());

const app = document.getElementById('app');
if (!app) {
  throw new Error('conformance: missing #app element');
}

// Render SVG into the DOM
const snapshotState = instance.snapshot() as Record<string, unknown>;
const svgContent = (snapshotState['svgResult'] as { svg?: string })?.svg ?? '';
if (svgContent) {
  const container = document.createElement('div');
  container.innerHTML = svgContent;
  app.appendChild(container);
} else {
  const rootEl = document.createElement('div');
  rootEl.id = t0.id;
  rootEl.setAttribute('role', t0.role);
  rootEl.setAttribute('aria-label', t0.label ?? t0.id);
  rootEl.textContent = 'Number line conformance scene';
  app.appendChild(rootEl);
}

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
      const v = new VisualEngine();
      const r = v.validate(spec as EngineSpec);
      return { ok: r.valid, message: r.issues.map((i) => i.message).join('; ') };
    } catch (error) {
      const err = error as { code?: string; message?: string };
      return { ok: false, code: err.code, message: err.message };
    }
  },
  svg(): string {
    return svgContent;
  },
};