import { mountEngine, exposeHarness, loadSpec } from '@knowledgeassemble/dev-harness';

export function mountGeomap(app: HTMLElement): void {
  const spec = loadSpec('packages/geomap-engine/fixture/marker/input.geomap.json') as never;
  const result = mountEngine(spec, app);
  exposeHarness(window, result);
  window.__geomapHarness = window.__harness as unknown as Window['__geomapHarness'];
}