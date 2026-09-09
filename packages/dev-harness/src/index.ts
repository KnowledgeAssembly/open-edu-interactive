export type { EngineMountResult, LessonMountResult, RenderTarget, StubHostOptions } from './types.js';
export { createDefaultRegistry, getEngine } from './engine-registry.js';
export { createStubHost } from './stub-host.js';
export { mountEngine } from './mount-engine.js';
export { mountLesson } from './mount-lesson.js';
export { exposeHarness } from './harness-api.js';
export { validateSpec } from './validate-spec.js';