import { z } from 'zod';
import { ACTION_TYPES } from './actions.js';

export const TYPE_PATTERN = /^[a-z][a-z0-9-]*$/;
export const VERSION_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
export const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
export const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)?$/;

export const IDSchema = z.string().min(1).max(128).regex(ID_PATTERN);
export const ActionTypeSchema = z.enum(ACTION_TYPES);

function uniqueArray<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(item)
    .superRefine((values, ctx) => {
      const seen = new Set<string>();
      for (const [index, value] of values.entries()) {
        const key = JSON.stringify(value);
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'items must be unique',
            path: [index],
          });
        }
        seen.add(key);
      }
    });
}

export const ReasoningModeSchema = z.enum([
  'identify',
  'compare',
  'sequence',
  'classify',
  'estimate',
  'explore',
  'predict',
  'explain',
  'analyze',
  'construct',
  'investigate',
]);

export const MetadataSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    language: z.string().regex(LANGUAGE_PATTERN).optional(),
    locale: z.string().optional(),
    tags: uniqueArray(z.string()).optional(),
    subject: z.string().optional(),
    educationalLevel: z.string().optional(),
    estimatedInteractionTime: z.number().int().min(0).optional(),
    author: z.string().optional(),
  })
  .strict();

export const PurposeSchema = z
  .object({
    learningObjective: z.string().min(1),
    interactionGoal: z.string().optional(),
    reasoningMode: ReasoningModeSchema.optional(),
  })
  .strict();

export const LayoutSchema = z
  .object({
    type: z
      .enum(['auto', 'fixed', 'flow', 'grid', 'radial', 'hierarchical', 'custom'])
      .optional(),
    orientation: z
      .enum([
        'horizontal',
        'vertical',
        'left-to-right',
        'right-to-left',
        'top-to-bottom',
        'bottom-to-top',
      ])
      .optional(),
    alignment: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    spacing: z.number().min(0).optional(),
    padding: z.number().min(0).optional(),
    responsive: z.boolean().optional(),
  })
  .strict();

export const GuidedInteractionSchema = z
  .object({
    enabled: z.boolean(),
    steps: z.array(z.string()).min(1).optional(),
  })
  .strict();

export const InteractionSchema = z
  .object({
    mode: z
      .enum(['explore', 'identify', 'compare', 'sequence', 'classify', 'predict', 'construct', 'investigate', 'explain'])
      .optional(),
    actions: uniqueArray(ActionTypeSchema).optional(),
    guided: GuidedInteractionSchema.optional(),
    allowReset: z.boolean().optional(),
    allowUndo: z.boolean().optional(),
    allowRedo: z.boolean().optional(),
  })
  .strict();

export const FeedbackSchema = z
  .object({
    correct: z.string().optional(),
    incorrect: z.string().optional(),
    hint: z.string().optional(),
    partiallyCorrect: z.string().optional(),
    completed: z.string().optional(),
  })
  .strict();

export const ReferenceSchema = z
  .object({
    id: IDSchema,
    type: z.string().optional(),
    engine: z.string().regex(TYPE_PATTERN).optional(),
  })
  .strict();

export const QuestionSchema = z
  .object({
    id: IDSchema,
    type: ReasoningModeSchema,
    prompt: z.string().min(1),
    interaction: z
      .object({
        type: ActionTypeSchema,
      })
      .strict()
      .optional(),
    targets: z.array(ReferenceSchema).optional(),
    feedback: FeedbackSchema.optional(),
  })
  .strict();

export const AccessibilitySchema = z
  .object({
    label: z.string().min(1),
    description: z.string().optional(),
    keyboard: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    alternativeRepresentation: z.string().optional(),
    alternativeRepresentationType: z
      .enum(['linear', 'text', 'table', 'list', 'structured'])
      .optional(),
    focusOrder: z.array(z.string()).optional(),
    announcements: z.boolean().optional(),
  })
  .strict();

export const MotionSchema = z
  .object({
    enabled: z.boolean().optional(),
    reducedMotionBehavior: z.enum(['instant', 'minimal', 'disabled']).optional(),
  })
  .strict();

export const AppearanceSchema = z
  .object({
    theme: z.string().optional(),
    density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
    motion: MotionSchema.optional(),
  })
  .strict();

export const EventDefinitionSchema = z
  .object({
    type: z.string().regex(EVENT_TYPE_PATTERN),
    description: z.string().optional(),
  })
  .strict();

export const ConditionSchema = z
  .object({
    type: z.enum(['selected', 'focused', 'highlighted', 'completed', 'connected', 'placed', 'state']),
    target: ReferenceSchema.optional(),
    state: z.object({}).passthrough().optional(),
  })
  .strict();

export const CompletionSchema = z
  .object({
    enabled: z.boolean().optional(),
    conditions: z.array(ConditionSchema).optional(),
    requireAll: z.boolean().optional(),
  })
  .strict();

export const ResourceSchema = z
  .object({
    id: IDSchema,
    type: z.enum(['image', 'audio', 'video', 'svg', 'document', 'data', 'map', 'other']),
    src: z.string().optional(),
    alt: z.string().optional(),
    mimeType: z.string().optional(),
  })
  .strict();

export const SourceSchema = z
  .object({
    type: z.enum([
      'authoritative',
      'reference',
      'illustrative',
      'simulated',
      'learner-generated',
      'ai-generated',
    ]),
    title: z.string().optional(),
    citation: z.string().optional(),
    url: z.string().url().optional(),
    author: z.string().optional(),
    date: z.string().optional(),
  })
  .strict();

export const EnvelopeSchema = z
  .object({
    type: z.string().regex(TYPE_PATTERN),
    version: z.string().regex(VERSION_PATTERN),
    id: IDSchema,
    metadata: MetadataSchema.optional(),
    purpose: PurposeSchema.optional(),
    content: z.object({}).passthrough().optional(),
    layout: LayoutSchema.optional(),
    interaction: InteractionSchema.optional(),
    questions: z.array(QuestionSchema).optional(),
    accessibility: AccessibilitySchema.optional(),
    appearance: AppearanceSchema.optional(),
    state: z.object({}).passthrough().optional(),
    events: uniqueArray(EventDefinitionSchema).optional(),
    completion: CompletionSchema.optional(),
    resources: z.array(ResourceSchema).optional(),
    sources: z.array(SourceSchema).optional(),
    capabilities: uniqueArray(z.string().regex(TYPE_PATTERN)).optional(),
  })
  .strict();
