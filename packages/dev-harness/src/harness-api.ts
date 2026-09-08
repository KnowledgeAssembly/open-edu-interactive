import type { EngineAction, EngineEvent } from '@knowledgeassemble/interactive-engine';
import type { EngineMountResult, LessonMountResult } from './types.js';

export function exposeHarness(
  window: Window,
  mount: EngineMountResult | LessonMountResult,
  extras?: Record<string, unknown>,
): void {
  const isEngine = 'instanceId' in mount;

  const dispatch = (a: EngineAction | string, action?: EngineAction): void => {
    if (typeof a === 'string') {
      (mount as LessonMountResult).dispatch(a, action as EngineAction);
    } else if ('dispatch' in mount) {
      (mount as EngineMountResult).dispatch(a);
    }
  };

  const snapshot = (): unknown => {
    if (isEngine) {
      return (mount as EngineMountResult).snapshot();
    }
    return (mount as LessonMountResult).snapshot((mount as LessonMountResult).instances()[0] ?? '');
  };

  const events = (): readonly EngineEvent[] => {
    if ('events' in mount) {
      return (mount as EngineMountResult | LessonMountResult).events();
    }
    return [];
  };

  const tryCreate = (spec: unknown): { ok: boolean; code?: string; message?: string } => {
    if ('validate' in mount && typeof (mount as EngineMountResult).validate === 'function') {
      const result = (mount as EngineMountResult).validate(spec);
      return { ok: result.valid, code: result.issues[0]?.code, message: result.issues.map((i) => i.message).join('; ') };
    }
    return { ok: true };
  };

  const harness = { dispatch, snapshot, events, tryCreate, ...extras };

  (window as unknown as { __harness?: unknown }).__harness = harness;
}