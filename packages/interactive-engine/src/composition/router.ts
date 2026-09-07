import { EngineError } from '../core/errors.js';
import type { EngineAction, EngineEvent, EngineInstance } from '../index.js';
import type { Binding } from './schema.js';

function resolvePath(obj: unknown, path: string): unknown {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export class Router {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly bindings: readonly Binding[],
    private readonly instances: ReadonlyMap<string, EngineInstance>,
  ) {}

  start(): void {
    for (const binding of this.bindings) {
      const from = this.instances.get(binding.from);
      if (!from) {
        throw new EngineError(
          'INVALID_REFERENCE',
          `composition: binding "${binding.on}" from instance "${binding.from}" not found`,
        );
      }

      const to = this.instances.get(binding.dispatch.to);
      if (!to) {
        throw new EngineError(
          'INVALID_REFERENCE',
          `composition: binding "${binding.on}" to instance "${binding.dispatch.to}" not found`,
        );
      }

      const unsub = from.subscribe((event: EngineEvent) => {
        if (event.name !== binding.on) return;

        let targetId: string | undefined;
        if (binding.dispatch.targetIdFrom) {
          const resolved = resolvePath(
            event.action?.payload ?? event.data,
            binding.dispatch.targetIdFrom,
          );
          if (typeof resolved === 'string') {
            targetId = resolved;
          }
        } else if (binding.dispatch.targetId) {
          targetId = binding.dispatch.targetId;
        }

        if (!targetId) {
          throw new EngineError(
            'INVALID_REFERENCE',
            `composition: binding "${binding.on}" target id not resolvable from payload`,
          );
        }

        to.dispatch({ type: binding.dispatch.action, target: { id: targetId } } as EngineAction);
      });

      this.unsubscribers.push(unsub);
    }
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}