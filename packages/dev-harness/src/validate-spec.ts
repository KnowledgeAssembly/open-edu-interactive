import type { EngineType, ValidationResult } from '@knowledgeassemble/interactive-engine';
import { getEngine } from './engine-registry.js';

export function validateSpec(spec: unknown, engineType: EngineType): ValidationResult {
  const engine = getEngine(engineType);
  return engine.validate(spec as never);
}