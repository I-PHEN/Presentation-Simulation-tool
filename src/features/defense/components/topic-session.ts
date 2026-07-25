import type { DefenseMode, ExaminerStance } from '@/features/defense/types';

export interface TopicConfig {
  topic: string;
  mode: DefenseMode;
  stance: ExaminerStance;
}

/**
 * The create payload for a deckless topic session. The presence of `topic`
 * (and absence of `deck`) is what routes /api/session into its topic branch.
 */
export function buildTopicSessionPayload({ topic, mode, stance }: TopicConfig) {
  return { topic: topic.trim(), mode, stance };
}

/** A typed-your-own topic overrides the selected recommendation; both trimmed. */
export function chooseTopic(selected: string, custom: string): string {
  const typed = custom.trim();
  return typed || selected.trim();
}
