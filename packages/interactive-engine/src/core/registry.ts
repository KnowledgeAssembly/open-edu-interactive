import type { Engine, EngineType } from './engine.js';
import { EngineError } from './errors.js';

export class EngineRegistry {
  private engines = new Map<EngineType, Engine>();

  register(engine: Engine): void {
    if (this.engines.has(engine.type)) {
      throw new EngineError(
        'INVALID_STATE',
        `engine of type "${engine.type}" is already registered`,
        engine.type,
      );
    }
    this.engines.set(engine.type, engine);
  }

  get(type: EngineType): Engine | undefined {
    return this.engines.get(type);
  }

  list(): EngineType[] {
    return [...this.engines.keys()];
  }
}
