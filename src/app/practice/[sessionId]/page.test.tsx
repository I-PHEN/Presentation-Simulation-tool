import { describe, expect, it } from 'vitest';
import { parseDefenseSessionResponse } from './page';

describe('practice session route', () => {
  it('parses valid defense session response correctly', () => {
    const validData = {
      defense: {
        id: 'practice-session-1',
        deck: {
          sourceName: 'Practice Deck',
          slides: [{ index: 0, text: 'Slide text', imageUrl: 'image.png' }],
        },
        mode: 'mock',
        stance: 'rigorous',
        transcriptSegments: [],
        examinerEvents: [],
        status: 'upload',
      },
    };

    const parsed = parseDefenseSessionResponse(validData);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('practice-session-1');
    expect(parsed?.mode).toBe('mock');
    expect(parsed?.stance).toBe('rigorous');
  });

  it('returns null for invalid defense session data', () => {
    const invalidData = { defense: null };
    expect(parseDefenseSessionResponse(invalidData)).toBeNull();
  });
});
