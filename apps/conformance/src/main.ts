import { a11yTreeOf, createPlatformInstance } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import type { EngineAction, EngineSpec } from '@knowledgeassemble/interactive-engine';

interface HarnessRemote {
  dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void;
  snapshot(): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
  svg?(): string;
}

declare global {
  interface Window {
    __harness?: HarnessRemote;
    __visualHarness?: HarnessRemote;
  }
}

function makeHost(emitted: Array<{ seq: number; name: string; action?: unknown }>): Parameters<typeof createPlatformInstance>[1] {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: (message: string) => console.log('[announce]', message),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 200) {
        emitted.push({ seq: event.seq, name: event.name, action: event.action });
      }
    },
    resolveAsset: (id: string) => id,
  };
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('conformance: missing #app element');
}

const engineParam = new URLSearchParams(window.location.search).get('engine') ?? 'core';

if (engineParam === 'visual') {
  const SPEC: EngineSpec = {
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

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = makeHost(emitted);
  const engine = new VisualEngine();
  const instance = engine.instantiate(SPEC, host);

  const state = instance.snapshot() as Record<string, unknown>;
  const svgContent = (state['svgResult'] as { svg?: string } | undefined)?.svg ?? '';

  const svgContainer = document.createElement('div');
  svgContainer.setAttribute('data-oedu-root', 'visual');
  if (svgContent) {
    svgContainer.innerHTML = svgContent;
  } else {
    svgContainer.textContent = 'visual conformance: no svg';
  }
  app.appendChild(svgContainer);

  window.__visualHarness = {
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
        const r = new VisualEngine().validate(spec as EngineSpec);
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
  window.__harness = window.__visualHarness;
} else {
  const SPEC: EngineSpec = {
    type: 'visual',
    version: '1.0.0',
    id: 'number-line-conformance',
    metadata: { title: 'Number Line' },
    purpose: { learningObjective: 'Select the highlighted value on the number line' },
    interaction: { actions: ['select', 'focus', 'reset'] },
    content: {},
  };

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = makeHost(emitted);
  const instance = createPlatformInstance(SPEC, host);
  const t0 = a11yTreeOf(instance.snapshot());

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
}
