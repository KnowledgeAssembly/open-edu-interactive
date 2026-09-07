import { z } from 'zod';

export const VISUAL_KINDS = [
  'number-line',
  'counting-set',
  'fraction',
  'fraction-comparison',
  'clock',
  'coordinate-grid',
  'geometry',
  'comparison',
  'illustration',
] as const;

export type VisualKind = (typeof VISUAL_KINDS)[number];

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
const TOKEN_PATTERN = /^[a-z]+\.[a-z]+$/;
const tokenRecord = z.record(z.string().regex(TOKEN_PATTERN));

export const ElementSchema: z.ZodType<ElementSpec> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.enum(['line', 'tick', 'text', 'circle', 'rect', 'group', 'shape', 'marker', 'axis']),
    role: z.string().optional(),
    value: z.number().optional(),
    interactive: z.boolean().optional(),
    acceptsActions: z.array(z.string()).optional(),
    style: tokenRecord.optional(),
    children: z.array(ElementSchema).optional(),
  }).strict()
);

export interface ElementSpec {
  id: string;
  type: string;
  role?: string;
  value?: number;
  interactive?: boolean;
  acceptsActions?: string[];
  style?: Record<string, string>;
  children?: ElementSpec[];
}

export const RelationshipSchema = z
  .object({
    type: z.enum(['labels', 'points-to', 'contains', 'part-of', 'precedes', 'follows', 'compares-with', 'corresponds-to', 'belongs-to', 'associated-with']),
    source: z.string().min(1).max(128).regex(ID_PATTERN),
    target: z.string().min(1).max(128).regex(ID_PATTERN),
  })
  .strict();

export const ComponentInstanceSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.string(),
    props: z.record(z.unknown()).optional(),
    layout: z.record(z.unknown()).optional(),
    style: tokenRecord.optional(),
    accessibility: z.record(z.unknown()).optional(),
    interaction: z.record(z.unknown()).optional(),
  })
  .strict();

export const VisualContentSchema = z
  .object({
    kind: z.enum(VISUAL_KINDS),
    canvas: z
      .object({
        aspectRatio: z.string().optional(),
        background: z.string().optional(),
      })
      .strict()
      .optional(),
    theme: z
      .object({
        name: z.string().optional(),
        mode: z.enum(['light', 'dark', 'high-contrast', 'print']).optional(),
      })
      .strict()
      .optional(),
    data: z.record(z.unknown()).optional(),
    elements: z.array(ElementSchema).optional(),
    components: z.array(ComponentInstanceSchema).optional(),
    relationships: z.array(RelationshipSchema).optional(),
    entities: z
      .array(
        z
          .object({
            id: z.string().min(1).max(128).regex(ID_PATTERN),
            label: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
    range: z
      .object({
        min: z.number(),
        max: z.number(),
        step: z.number().positive(),
        majorStep: z.number().positive().optional(),
      })
      .strict()
      .optional(),
    highlight: z.array(z.number()).optional(),
    selectable: z.array(z.string()).optional(),
  })
  .strict();

export type VisualContent = z.infer<typeof VisualContentSchema>;

export interface VisualSpec {
  type: string;
  version: string;
  id: string;
  content: VisualContent;
  accessibility?: { label?: string; description?: string };
  interaction?: { mode?: string; actions?: string[] };
  [key: string]: unknown;
}

export function validateVisualSpec(input: unknown): {
  valid: boolean;
  issues: { path: string; message: string }[];
} {
  const result = VisualContentSchema.safeParse(input);
  if (result.success) {
    return { valid: true, issues: [] };
  }
  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}