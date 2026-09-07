import type { Engine, EngineAction, EngineEvent, EngineHost, EngineInstance, EngineType } from '../index.js';
import { EngineError } from '../core/errors.js';
import { EngineRegistry } from '../core/registry.js';
import { EventLog } from '../runtime/event-log.js';
import { validateEnvelope } from '../validation/validate.js';
import { Router } from './router.js';
import { LessonSchema } from './schema.js';
import type { LessonDefinition } from './schema.js';

export interface LessonRuntime {
  readonly instances: ReadonlyMap<string, EngineInstance>;
  dispatch(instanceId: string, action: EngineAction): void;
  snapshot(instanceId: string): unknown;
  events(): readonly EngineEvent[];
  stop(): void;
}

export class Lesson {
  private readonly def: LessonDefinition;
  private readonly registry: EngineRegistry;

  static load(input: unknown, registry: EngineRegistry): Lesson {
    const parsed = LessonSchema.safeParse(input);
    if (!parsed.success) {
      throw new EngineError(
        'INVALID_SPEC',
        `composition: invalid lesson structure — ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }

    const def = parsed.data;

    for (const entry of def.engines) {
      const envelope = entry.spec as { type?: string };
      const l1 = validateEnvelope(entry.spec);
      if (!l1.valid) {
        throw new EngineError(
          'INVALID_SPEC',
          `composition: engine "${entry.instanceId}" spec failed L1 validation — ${l1.issues[0]?.message ?? 'unknown error'}`,
        );
      }
      if (entry.engine !== envelope.type) {
        throw new EngineError(
          'INVALID_SPEC',
          `composition: engine "${entry.instanceId}" declares engine="${entry.engine}" but spec.type="${envelope.type ?? '<missing>'}"`,
        );
      }
    }

    for (const binding of def.bindings) {
      const hasFrom = binding.dispatch.targetIdFrom !== undefined;
      const hasStatic = binding.dispatch.targetId !== undefined;
      if (hasFrom === hasStatic) {
        throw new EngineError(
          'INVALID_SPEC',
          `composition: binding "${binding.on}" must define exactly one of targetIdFrom or targetId`,
        );
      }
      const target = def.engines.find((entry) => entry.instanceId === binding.dispatch.to);
      if (!target) {
        throw new EngineError(
          'INVALID_REFERENCE',
          `composition: binding "${binding.on}" references unknown target instance "${binding.dispatch.to}"`,
        );
      }
      const declared = (target.spec as { interaction?: { actions?: string[] } }).interaction?.actions;
      if (declared && !declared.includes(binding.dispatch.action)) {
        throw new EngineError(
          'INVALID_ACTION',
          `composition: binding "${binding.on}" dispatches action "${binding.dispatch.action}" on "${binding.dispatch.to}" but that instance does not declare it in interaction.actions`,
        );
      }
    }

    return new Lesson(def, registry);
  }

  private constructor(def: LessonDefinition, registry: EngineRegistry) {
    this.def = def;
    this.registry = registry;
  }

  start(host: EngineHost): LessonRuntime {
    const seen = new Set<string>();
    for (const entry of this.def.engines) {
      if (seen.has(entry.instanceId)) {
        throw new EngineError(
          'INVALID_SPEC',
          `composition: duplicate instanceId "${entry.instanceId}"`,
        );
      }
      seen.add(entry.instanceId);
    }

    const sharedLog = new EventLog();
    const instances = new Map<string, EngineInstance>();

    const sharedHost: EngineHost = {
      ...host,
      onEvent: (event: EngineEvent) => {
        const stamped = sharedLog.append(
          event.name,
          event.instanceId,
          event.data as Record<string, unknown> | undefined,
          event.action,
        );
        host.onEvent(stamped);
      },
    };

    for (const entry of this.def.engines) {
      const engine = this.registry.get(entry.engine as EngineType);
      if (!engine) {
        throw new EngineError(
          'INVALID_REFERENCE',
          `composition: no engine registered for type "${entry.engine}"`,
        );
      }
      const instance = engine.instantiate(entry.spec as Parameters<Engine['instantiate']>[0], sharedHost, entry.instanceId);
      instances.set(entry.instanceId, instance);
    }

    const router = new Router(this.def.bindings, instances);
    router.start();

    return {
      instances,
      dispatch(instanceId: string, action: EngineAction): void {
        const inst = instances.get(instanceId);
        if (!inst) {
          throw new EngineError(
            'INVALID_REFERENCE',
            `composition: unknown instance "${instanceId}"`,
          );
        }
        inst.dispatch(action);
        router.run();
      },
      snapshot(instanceId: string): unknown {
        const inst = instances.get(instanceId);
        if (!inst) {
          throw new EngineError(
            'INVALID_REFERENCE',
            `composition: unknown instance "${instanceId}"`,
          );
        }
        return inst.snapshot();
      },
      events(): readonly EngineEvent[] {
        return sharedLog.list();
      },
      stop(): void {
        router.stop();
        for (const inst of instances.values()) {
          inst.teardown();
        }
      },
    };
  }
}
