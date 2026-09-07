export const ERROR_CODES = [
  'INVALID_SPEC',
  'INVALID_VERSION',
  'INVALID_ENTITY',
  'INVALID_REFERENCE',
  'INVALID_ACTION',
  'INVALID_STATE',
  'UNSUPPORTED_ACTION',
  'RESOURCE_ERROR',
  'ACCESSIBILITY_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class EngineError extends Error {
  readonly code: ErrorCode;
  readonly targetId?: string;

  constructor(code: ErrorCode, message: string, targetId?: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.targetId = targetId;
  }

  toJSON(): { error: { code: ErrorCode; message: string; targetId?: string } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.targetId ? { targetId: this.targetId } : {}),
      },
    };
  }
}
