import { describe, expect, it } from 'vitest';

import { spokenBySlide } from './transcript';

describe('spokenBySlide', () => {
  it('joins only presenter speech for the active slide', () => {
    expect(spokenBySlide([
      { role: 'presenter', slideIndex: 7, text: 'The effect persisted.', startedAtMs: 0, endedAtMs: 1200 },
      { role: 'examiner', slideIndex: 7, text: 'What evidence?', startedAtMs: 1201, endedAtMs: 1800 },
      { role: 'presenter', slideIndex: 7, text: 'Across our sample.', startedAtMs: 1801, endedAtMs: 2600 },
    ])).toEqual({ 7: 'The effect persisted. Across our sample.' });
  });
});
