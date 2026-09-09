import type { EngineAction, EngineEvent, EngineSpec, EngineType, ValidationResult } from '@knowledgeassemble/interactive-engine';

export interface EngineMountResult {
  instanceId: string;
  dispatch(action: EngineAction): void;
  snapshot(): unknown;
  events(): readonly EngineEvent[];
  validate(spec: unknown): ValidationResult;
  teardown(): void;
  renderTargets: RenderTarget[];
}

export interface LessonMountResult {
  dispatch(instanceId: string, action: EngineAction): void;
  snapshot(instanceId: string): unknown;
  events(): readonly EngineEvent[];
  instances(): string[];
  teardown(): void;
}

export interface RenderTarget {
  container: HTMLElement;
  kind: 'svg' | 'tabular' | 'alternative';
}

export interface StubHostOptions {
  locale?: string;
  tokens?: Record<string, string>;
  reducedMotion?: boolean;
  onEvent?: (event: { seq: number; name: string; action?: unknown }) => void;
  onAnnounce?: (message: string) => void;
}