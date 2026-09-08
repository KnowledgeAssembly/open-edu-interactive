import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EngineRegistry, Lesson, type EngineAction } from '@knowledgeassemble/interactive-engine';
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = resolve(THIS_DIR, '../../../docs/fixtures/p7/composed-lesson.json');
const GOLDEN_URL = resolve(THIS_DIR, '../fixture/composed-lesson.golden.json');
const REGEN = process.env.REGEN === '1';

function makeHost(): EngineHost {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

function runInteraction(): unknown {
  const lesson = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as never;
  const registry = new EngineRegistry();
  registry.register(new VisualEngine());
  registry.register(new TimelineEngine());

  const runtime = Lesson.load(lesson, registry).start(makeHost());
  runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
  const visual = runtime.snapshot('visual-independence') as { focus: string | null; selection: string[] };
  const events = runtime.events().map((e) => ({
    id: e.id,
    seq: e.seq,
    name: e.name,
    instanceId: e.instanceId,
    action: e.action ? { type: e.action.type, target: e.action.target } : undefined,
    data: e.data,
  }));
  runtime.stop();
  return { snapshot: { focus: visual.focus, selection: visual.selection }, events };
}

describe('composed lesson replay parity', () => {
  it('deterministic: two runs produce byte-identical output', () => {
    const first = JSON.stringify(runInteraction());
    const second = JSON.stringify(runInteraction());
    expect(first).toBe(second);
  });

  it('output byte-matches the checked-in golden composed-lesson log', () => {
    const output = `${JSON.stringify(runInteraction(), null, 2)}\n`;
    const golden = readFileSync(GOLDEN_URL, 'utf8');
    expect(output).toBe(golden);
  });

  it('golden is byte-identical to the frozen P2.5 narrative-timeline-visual log', () => {
    const frozen = readFileSync(
      resolve(THIS_DIR, '../../../packages/interactive-engine/test/fixtures/composition/narrative-timeline-visual.golden.json'),
      'utf8',
    );
    const composed = readFileSync(GOLDEN_URL, 'utf8');
    expect(composed).toBe(frozen);
  });
});

describe.skipIf(!REGEN)('composed lesson golden regeneration (REGEN=1)', () => {
  it('writes the golden composed-lesson event log', () => {
    writeFileSync(GOLDEN_URL, `${JSON.stringify(runInteraction(), null, 2)}\n`);
  });
});
