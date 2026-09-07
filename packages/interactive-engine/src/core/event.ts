import type { EngineAction } from './action.js';

export interface EngineEvent {
  id: string;
  seq: number;
  name: string;
  instanceId: string;
  action?: EngineAction;
  data?: Record<string, unknown>;
}

export const LIFECYCLE_EVENTS = [
  'engine-mounted',
  'engine-ready',
  'engine-reset',
  'state-changed',
  'interaction-started',
  'interaction-completed',
] as const;
