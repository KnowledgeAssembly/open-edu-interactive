import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { EngineAction, EngineEvent, LessonDefinition } from '@knowledgeassemble/interactive-engine';
import type { InteractiveLessonHandle } from '@knowledgeassemble/interactive-react';
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';
import type { StubHostOptions } from './stub-host.js';
import { createStubHost } from './stub-host.js';
import type { LessonMountResult } from './types.js';

export function mountLesson(
  lesson: LessonDefinition,
  container: HTMLElement,
  opts?: { host?: StubHostOptions },
): LessonMountResult {
  const { bridge, events, clearEvents } = createStubHost(opts?.host);

  let handle: InteractiveLessonHandle | null = null;
  const root = createRoot(container);
  root.render(
    createElement(InteractiveLesson, {
      ref: (node: InteractiveLessonHandle | null) => {
        handle = node;
      },
      lesson,
      host: bridge,
    }),
  );

  return {
    dispatch(instanceId: string, action: EngineAction): void {
      handle?.dispatch(instanceId, action);
    },
    snapshot(instanceId: string): unknown {
      return handle?.snapshot(instanceId);
    },
    events(): readonly EngineEvent[] {
      return events() as readonly EngineEvent[];
    },
    instances(): string[] {
      return handle?.instances() ?? [];
    },
    teardown(): void {
      root.unmount();
      clearEvents();
    },
  };
}