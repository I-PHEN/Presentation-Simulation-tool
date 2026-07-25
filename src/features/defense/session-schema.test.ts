import { describe, expect, it } from 'vitest';

import { createDefenseSessionSchema, createTopicSessionSchema, defenseDeckSchema, syntheticTopicDeck, updateDefenseSessionSchema } from './session-schema';

describe('createDefenseSessionSchema', () => {
  const validPayloadWithoutStance = {
    title: 'Thesis',
    mode: 'mock' as const,
    deck: {
      sourceName: 'x.pptx',
      slides: [{ index: 1, text: 'Opening', imageUrl: 'slide-1.png' }],
    },
  };

  it('rejects a defense session without examiner stance', () => {
    expect(createDefenseSessionSchema.safeParse(validPayloadWithoutStance).success).toBe(false);
  });

  it('requires at least one grounded slide', () => {
    expect(() =>
      createDefenseSessionSchema.parse({
        title: 'Thesis',
        mode: 'mock',
        stance: 'rigorous',
        deck: { sourceName: 'x.pptx', slides: [] },
      }),
    ).toThrow(/slide/i);
  });
});

describe('createTopicSessionSchema', () => {
  it('accepts a topic + mode + stance and rejects a blank topic', () => {
    expect(createTopicSessionSchema.safeParse({ topic: 'Should AI be regulated?', mode: 'diagnostic', stance: 'rigorous' }).success).toBe(true);
    expect(createTopicSessionSchema.safeParse({ topic: '   ', mode: 'diagnostic', stance: 'rigorous' }).success).toBe(false);
    expect(createTopicSessionSchema.safeParse({ topic: 'x', mode: 'panel', stance: 'rigorous' }).success).toBe(false);
  });
});

describe('syntheticTopicDeck', () => {
  it('produces a one-card deck that satisfies defenseDeckSchema', () => {
    const deck = syntheticTopicDeck('  Ban cars downtown  ');
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]).toMatchObject({ index: 1, text: 'Ban cars downtown', imageUrl: 'topic' });
    expect(defenseDeckSchema.safeParse(deck).success).toBe(true);
  });
});

describe('updateDefenseSessionSchema', () => {
  const segment = { role: 'presenter', slideIndex: 1, text: 'A grounded explanation.', startedAtMs: 0, endedAtMs: 30 };
  const event = { kind: 'question', text: 'What supports that?', slideIndex: 1, evidence: 'Slide claim: Opening', occurredAtMs: 31 };

  it('accepts valid persisted rehearsal state and rejects malformed segments or unknown fields', () => {
    expect(updateDefenseSessionSchema.safeParse({ transcriptSegments: [segment], examinerEvents: [event], status: 'practicing' }).success).toBe(true);
    expect(updateDefenseSessionSchema.safeParse({ transcriptSegments: [{ ...segment, endedAtMs: -1 }] }).success).toBe(false);
    expect(updateDefenseSessionSchema.safeParse({ examinerEvents: [{ ...event, evidence: '' }] }).success).toBe(false);
    expect(updateDefenseSessionSchema.safeParse({ status: 'completed', deckContext: '{}' }).success).toBe(false);
  });
});
