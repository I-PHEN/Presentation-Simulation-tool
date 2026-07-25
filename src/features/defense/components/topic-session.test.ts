import { describe, expect, it } from 'vitest';
import { buildTopicSessionPayload, chooseTopic } from './topic-session';

describe('buildTopicSessionPayload', () => {
  it('trims the topic and passes mode + stance through', () => {
    expect(buildTopicSessionPayload({ topic: '  Ban cars downtown  ', mode: 'mock', stance: 'supportive' }))
      .toEqual({ topic: 'Ban cars downtown', mode: 'mock', stance: 'supportive' });
  });
});

describe('chooseTopic', () => {
  it('prefers a typed topic over the selected recommendation', () => {
    expect(chooseTopic('Recommended one', '  My own ')).toBe('My own');
  });

  it('falls back to the selected recommendation when nothing is typed', () => {
    expect(chooseTopic('Recommended one', '   ')).toBe('Recommended one');
  });

  it('is empty when neither is provided', () => {
    expect(chooseTopic('', '')).toBe('');
  });
});
