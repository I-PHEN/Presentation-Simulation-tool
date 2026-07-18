import { z } from 'zod';

export const createExaminerEventSchema = z.object({
  kind: z.enum(['interrupt', 'question', 'follow_up']),
  text: z.string().trim().min(1).max(1_000),
  slideIndex: z.number().int().positive(),
  evidence: z.string().trim().min(1).max(2_000),
  occurredAtMs: z.number().finite().nonnegative(),
}).strict();
