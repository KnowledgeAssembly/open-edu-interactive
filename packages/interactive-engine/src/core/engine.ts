import type { EngineSpec } from '../schemas/envelope.js';
import type { ValidationResult } from '../validation/pipeline.js';
import type { EngineAction } from './action.js';
import type { EngineEvent } from './event.js';
import type { EngineHost } from './host.js';
import type { EngineState } from './state.js';

export type EngineType = 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram';

export interface EngineInstance {
  readonly id: string;
  readonly engine: EngineType;
  dispatch(action: EngineAction): void;
  snapshot(): Readonly<EngineState>;
  subscribe(fn: (e: EngineEvent) => void): () => void;
  teardown(): void;
}

export interface Engine {
  readonly type: EngineType;
  validate(spec: EngineSpec): ValidationResult;
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
