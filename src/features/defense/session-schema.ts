import { z } from 'zod';
import { createExaminerEventSchema } from './examiner';

export const transcriptSegmentSchema = z.object({
  role: z.enum(['presenter', 'examiner']),
  slideIndex: z.number().int().positive(),
  text: z.string().trim().min(1).max(5_000),
  startedAtMs: z.number().finite().nonnegative(),
  endedAtMs: z.number().finite().nonnegative(),
}).strict().refine((segment) => segment.endedAtMs >= segment.startedAtMs, {
  message: 'Transcript segment timestamps must be ordered',
  path: ['endedAtMs'],
});

export const defenseDeckSchema = z.object({
  sourceName: z.string().trim().min(1),
  slides: z.array(z.object({ index: z.number().int().positive(), text: z.string(), imageUrl: z.string().min(1) }).strict()).min(1),
}).strict();
export const examinerEventsSchema = z.array(createExaminerEventSchema).max(2_000);
export const transcriptSegmentsSchema = z.array(transcriptSegmentSchema).max(10_000);

export const createDefenseSessionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  mode: z.enum(['diagnostic', 'mock']),
  stance: z.enum(['supportive', 'rigorous']),
  userId: z.string().nullable().optional(),
  deck: defenseDeckSchema,
});

export const updateDefenseSessionSchema = z.object({
  mode: z.enum(['diagnostic', 'mock']).optional(),
  stance: z.enum(['supportive', 'rigorous']).optional(),
  transcriptSegments: transcriptSegmentsSchema.optional(),
  examinerEvents: examinerEventsSchema.optional(),
  status: z.enum(['upload', 'analyzed', 'practicing', 'completed']).optional(),
}).strict().refine((update) => Object.keys(update).length > 0, { message: 'At least one update is required' });
