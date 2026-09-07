import { z } from 'zod';
import { ActionTypeSchema } from '../schemas/envelope.zod.js';

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
export const NAMESPACED_EVENT_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;

export const ENGINE_TYPES = ['visual', 'geomap', 'chart', 'timeline', 'diagram'] as const;

export const EngineEntrySchema = z
  .object({
    instanceId: z.string().min(1).max(128).regex(ID_PATTERN),
    engine: z.enum(ENGINE_TYPES),
    spec: z.object({}).passthrough(),
  })
  .strict();

export const DispatchSchema = z
  .object({
    to: z.string().min(1),
    action: ActionTypeSchema,
    targetIdFrom: z.string().optional(),
    targetId: z.string().optional(),
  })
  .strict();

export const BindingSchema = z
  .object({
    on: z.string().regex(NAMESPACED_EVENT_PATTERN),
    from: z.string().min(1),
    dispatch: DispatchSchema,
  })
  .strict();

export const LessonSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    title: z.string().min(1).optional(),
    engines: z.array(EngineEntrySchema).min(1),
    bindings: z.array(BindingSchema),
  })
  .strict();

export type LessonDefinition = z.infer<typeof LessonSchema>;
export type EngineEntry = z.infer<typeof EngineEntrySchema>;
export type BindingAction = z.infer<typeof DispatchSchema>;
export type Binding = z.infer<typeof BindingSchema>;
