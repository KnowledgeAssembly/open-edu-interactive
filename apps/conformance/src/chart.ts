import { mountEngine, exposeHarness, loadSpec } from '@knowledgeassemble/dev-harness';

export function mountChart(app: HTMLElement): void {
  const spec = loadSpec('packages/chart-engine/fixture/bar/input.chart.json') as never;
  const result = mountEngine(spec, app);
  exposeHarness(window, result);
  window.__chartHarness = window.__harness as unknown as Window['__chartHarness'];
}