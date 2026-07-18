import { z } from 'zod';

export const createDefenseSessionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  mode: z.enum(['diagnostic', 'mock']),
  userId: z.string().nullable().optional(),
  deck: z.object({
    sourceName: z.string().min(1),
    slides: z
      .array(
        z.object({
          index: z.number().int().positive(),
          text: z.string(),
          imageUrl: z.string().min(1),
        }),
      )
      .min(1),
  }),
});
