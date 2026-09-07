import type { EngineAction } from './action.js';
import type { EngineType } from './engine.js';

export interface EngineState {
  instanceId: string;
  engine: EngineType;
  phase: 'registered' | 'validated' | 'running' | 'torn-down';
  selection: string[];
  focus: string | null;
  filter: string[];
  annotations: Record<string, 'open' | 'closed'>;
  expanded: string[];
  playback: 'playing' | 'paused' | 'stopped';
  step: number;
  lastAction: EngineAction | null;
}

export function initialState(instanceId: string, engine: EngineType): EngineState {
  return {
    instanceId,
    engine,
    phase: 'registered',
    selection: [],
    focus: null,
    filter: [],
    annotations: {},
    expanded: [],
    playback: 'stopped',
    step: 0,
    lastAction: null,
  };
}
