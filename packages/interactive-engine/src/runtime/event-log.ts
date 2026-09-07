import type { EngineAction } from '../core/action.js';
import type { EngineEvent } from '../core/event.js';

export class EventLog {
  private events: EngineEvent[] = [];
  private seq = 0;

  append(
    name: string,
    instanceId: string,
    data?: Record<string, unknown>,
    action?: EngineAction,
  ): EngineEvent {
    const event: EngineEvent = {
      id: `${instanceId}:${this.seq}`,
      seq: this.seq,
      name,
      instanceId,
      ...(action ? { action } : {}),
      ...(data ? { data } : {}),
    };
    this.seq += 1;
    this.events.push(event);
    return event;
  }

  list(): readonly EngineEvent[] {
    return [...this.events];
  }

  replay(): readonly EngineEvent[] {
    return structuredClone(this.events);
  }
}
