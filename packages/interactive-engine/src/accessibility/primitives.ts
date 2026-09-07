import type { EngineState } from '../core/state.js';

export interface A11yNode {
  id: string;
  role: string;
  label?: string;
  description?: string;
  children: A11yNode[];
}

export function a11yTreeOf(state: Readonly<EngineState>): A11yNode {
  return {
    id: state.instanceId,
    role: 'interactive-engine',
    label: state.instanceId || state.engine,
    children: [],
  };
}