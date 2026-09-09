import { mountEngine, exposeHarness, loadSpec } from '@knowledgeassemble/dev-harness';

export function mountDiagram(app: HTMLElement): void {
  const spec = loadSpec('packages/diagram-engine/fixture/concept-map/input.diagram.json') as never;
  const result = mountEngine(spec, app);
  exposeHarness(window, result);
  window.__diagramHarness = window.__harness as unknown as Window['__diagramHarness'];
}