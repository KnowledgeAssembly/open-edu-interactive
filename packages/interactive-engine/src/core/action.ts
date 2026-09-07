import type { ActionType } from '../schemas/actions.js';

export interface EngineAction {
  type: ActionType;
  target?: { id: string };
  targets?: { id: string }[];
  payload?: unknown;
}
