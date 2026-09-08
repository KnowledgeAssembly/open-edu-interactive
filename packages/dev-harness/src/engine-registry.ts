import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import type { Engine, EngineType } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';

const ENGINE_MAP: Record<EngineType, Engine> = {
  visual: new VisualEngine(),
  chart: new ChartEngine(),
  geomap: new GeoMapEngine(),
  timeline: new TimelineEngine(),
  diagram: new DiagramEngine(),
};

export function createDefaultRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  for (const engine of Object.values(ENGINE_MAP)) {
    registry.register(engine);
  }
  return registry;
}

export function getEngine(type: EngineType): Engine {
  const engine = ENGINE_MAP[type];
  if (!engine) {
    throw new Error(`dev-harness: unknown engine type "${type}"`);
  }
  return engine;
}
