import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type EngineAction } from '../src/index.js';
import { Lesson } from '../src/composition/lesson.js';
import { makeHost, makeRegistry } from './helpers/composition-stubs.js';

const FIXTURE_URL = new URL('../../../docs/fixtures/composition/narrative-timeline-visual.json', import.meta.url);
const GOLDEN_URL = new URL('./fixtures/composition/narrative-timeline-visual.golden.json', import.meta.url);
const canonicalFixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));

function runSmoke(): unknown {
  const registry = makeRegistry();
  const lesson = Lesson.load(canonicalFixture, registry);
  const { host } = makeHost();
  const runtime = lesson.start(host);
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

describe('Golden event log parity', () => {
  it('deterministic: two runs of the smoke interaction produce identical output', () => {
    const first = JSON.stringify(runSmoke());
    const second = JSON.stringify(runSmoke());
    expect(first).toBe(second);
  });

  it('output byte-matches the checked-in golden file', () => {
    const output = runSmoke();
    const outputStr = JSON.stringify(output, null, 2);

    if (!existsSync(GOLDEN_URL)) {
      const dir = new URL('.', GOLDEN_URL).pathname;
      mkdirSync(dir, { recursive: true });
      writeFileSync(GOLDEN_URL, outputStr + '\n', 'utf8');
      expect(true).toBe(true);
      return;
    }

    const golden = readFileSync(GOLDEN_URL, 'utf8');
    expect(outputStr + '\n').toBe(golden);
  });
});