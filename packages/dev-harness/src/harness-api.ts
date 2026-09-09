import type { EngineAction, EngineEvent } from '@knowledgeassemble/interactive-engine';
import type { EngineMountResult, LessonMountResult } from './types.js';

export function exposeHarness(
  window: Window,
  mount: EngineMountResult | LessonMountResult,
  extras?: Record<string, unknown>,
): void {
  const isEngine = 'instanceId' in mount;

  const harness = {
    dispatch(action: EngineAction): void {
      if ('dispatch' in mount) {
        (mount as EngineMountResult).dispatch(action);
      }
    },
    snapshot(): unknown {
      if ('snapshot' in mount) {
        if (isEngine) {
          return (mount as EngineMountResult).snapshot();
        }
        return (mount as LessonMountResult).snapshot((mount as LessonMountResult).instances()[0] ?? '');
      }
      return undefined;
    },
    events(): readonly EngineEvent[] {
      if ('events' in mount) {
        return (mount as EngineMountResult | LessonMountResult).events();
      }
      return [];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      if ('validate' in mount && typeof (mount as EngineMountResult).validate === 'function') {
        const result = (mount as EngineMountResult).validate(spec);
        return { ok: result.valid, code: result.issues[0]?.code, message: result.issues.map((i) => i.message).join('; ') };
      }
      return { ok: true };
    },
    ...extras,
  };

  (window as unknown as { __harness?: unknown }).__harness = harness;
}