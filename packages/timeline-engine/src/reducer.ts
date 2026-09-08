import {
  baseReducer,
  EngineError,
  type EngineAction,
  type EngineState,
} from '@knowledgeassemble/interactive-engine';

export function timelineReducer(
  state: EngineState,
  action: EngineAction,
  seq: readonly string[],
): EngineState {
  switch (action.type) {
    case 'select':
    case 'focus': {
      const id = action.target?.id;
      if (!id) {
        throw new EngineError('INVALID_ACTION', `timeline: action "${action.type}" requires a target.id`);
      }
      const idx = seq.indexOf(id);
      if (idx < 0) {
        throw new EngineError('INVALID_ENTITY', `timeline: unknown event "${id}"`, id);
      }
      const reduced = baseReducer(state, action);
      return { ...reduced, step: idx };
    }
    case 'play-pause': {
      return baseReducer(state, action);
    }
    case 'step': {
      if (seq.length === 0) {
        throw new EngineError('INVALID_STATE', 'timeline: cannot step with an empty event sequence');
      }
      const next = Math.min(state.step + 1, seq.length - 1);
      const clampedState = { ...state, step: next, lastAction: action };
      return clampedState;
    }
    case 'scrub': {
      const id = action.target?.id;
      if (!id) {
        throw new EngineError('INVALID_ACTION', 'timeline: action "scrub" requires a target.id');
      }
      const idx = seq.indexOf(id);
      if (idx < 0) {
        throw new EngineError('INVALID_ENTITY', `timeline: unknown event "${id}"`, id);
      }
      return { ...state, step: idx, lastAction: action };
    }
    case 'reset': {
      const fresh = baseReducer(state, action);
      return { ...fresh, step: 0, playback: 'stopped' as const };
    }
    default:
      return baseReducer(state, action);
  }
}