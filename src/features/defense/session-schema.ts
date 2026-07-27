import { z } from 'zod';
import { createExaminerEventSchema } from './examiner';
import type { DeckContext } from './types';

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
  mode: z.enum(['uninterrupted', 'diagnostic', 'mock']),
  stance: z.enum(['supportive', 'rigorous', 'hostile']),
  userId: z.string().nullable().optional(),
  deck: defenseDeckSchema,
});

export const createTopicSessionSchema = z.object({
  topic: z.string().trim().min(1).max(300),
  mode: z.enum(['uninterrupted', 'diagnostic', 'mock']),
  stance: z.enum(['supportive', 'rigorous', 'hostile']),
});

/**
 * A deckless topic session is modeled to the Slice-1 engine as a synthetic
 * one-card "deck" whose card text is the topic. This keeps the simulator, the
 * report pipeline, and defenseDeckSchema (slides.min(1), imageUrl.min(1))
 * unchanged; the room swaps SlideStage -> TopicStage on `source`, so the
 * `imageUrl` sentinel is never fetched.
 */
export function syntheticTopicDeck(topic: string): DeckContext {
  const trimmed = topic.trim();
  return { sourceName: trimmed.slice(0, 180), slides: [{ index: 1, text: trimmed, imageUrl: 'topic' }] };
}

/** Analysed webcam frames, on the same session clock as every other timestamp. */
export const deliverySamplesSchema = z.array(z.object({
  atMs: z.number().finite().nonnegative(),
  eyeContact: z.number().finite().min(0).max(100),
  posture: z.number().finite().min(0).max(100),
  presence: z.number().finite().min(0).max(100),
}).strict()).max(2_000);

export const practiceSettingsSchema = z.object({
  curveballFrequency: z.enum(['low', 'medium', 'high']),
  showRoomMood: z.boolean(),
  showPersonaBadges: z.boolean(),
}).strict();

export const updateDefenseSessionSchema = z.object({
  mode: z.enum(['uninterrupted', 'diagnostic', 'mock']).optional(),
  stance: z.enum(['supportive', 'rigorous', 'hostile']).optional(),
  transcriptSegments: transcriptSegmentsSchema.optional(),
  examinerEvents: examinerEventsSchema.optional(),
  deliverySamples: deliverySamplesSchema.optional(),
  status: z.enum(['upload', 'analyzed', 'practicing', 'completed']).optional(),
  practiceSettings: practiceSettingsSchema.optional(),
}).strict().refine((update) => Object.keys(update).length > 0, { message: 'At least one update is required' });
