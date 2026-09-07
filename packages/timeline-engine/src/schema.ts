import { z } from 'zod';

export const TIMELINE_EVENT_SELECTED = 'timeline.event-selected';

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

export const TimelineEventSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    date: z.string().min(1),
    links: z.record(z.string()).optional(),
  })
  .strict();

export const TimelineContentSchema = z
  .object({
    kind: z.literal('events'),
    events: z
      .array(TimelineEventSchema)
      .superRefine((events, ctx) => {
        const seen = new Set<string>();
        for (const [index, event] of events.entries()) {
          if (seen.has(event.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate event id "${event.id}"`,
              path: [index, 'id'],
            });
          }
          seen.add(event.id);
        }
      }),
  })
  .strict();

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineContent = z.infer<typeof TimelineContentSchema>;

export interface TimelineSpec {
  type: string;
  version: string;
  id: string;
  content: TimelineContent;
  interaction?: { mode?: string; actions?: string[] };
  metadata?: { title?: string };
  [key: string]: unknown;
}
