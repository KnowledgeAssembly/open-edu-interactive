import {
  baseReducer,
  EngineError,
  type EngineAction,
  type EngineState,
} from '@knowledgeassemble/interactive-engine';
import type { TimelineEvent } from './schema.js';

export function timelineReducer(
  state: EngineState,
  action: EngineAction,
  events: readonly TimelineEvent[],
): EngineState {
  switch (action.type) {
    case 'select': {
      const id = action.target?.id;
      if (!id) {
        throw new EngineError('INVALID_ACTION', 'timeline: action "select" requires a target.id');
      }
      const known = events.some((event) => event.id === id);
      if (!known) {
        throw new EngineError('INVALID_ENTITY', `timeline: unknown event "${id}"`, id);
      }
      return baseReducer(state, action);
    }
    case 'scrub':
      throw new EngineError(
        'UNSUPPORTED_ACTION',
        'timeline: scrub is not supported at P2.5',
        action.target?.id,
      );
    default:
      return baseReducer(state, action);
  }
}