import { mountEngine, exposeHarness, loadSpec } from '@knowledgeassemble/dev-harness';

export function mountTimeline(app: HTMLElement): void {
  const spec = loadSpec('packages/timeline-engine/fixture/events/input.timeline.json') as never;
  const result = mountEngine(spec, app);
  exposeHarness(window, result);
  window.__timelineHarness = window.__harness as unknown as Window['__timelineHarness'];
}