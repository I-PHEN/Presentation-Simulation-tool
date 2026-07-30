import { describe, expect, it } from 'vitest';
import { reportFromSummary } from './page';

describe('report page coaching wiring', () => {
  it('parses coaching report summary correctly', () => {
    const validReport = {
      coachingReport: {
        overallScore: 85,
        summary: 'Great executive presentation performance.',
        keyStrengths: ['Clear pacing', 'Strong hook'],
        areasForImprovement: ['Conclude with clearer call to action'],
        deliveryPacingWpm: 140,
        slideFeedback: [
          { slideIndex: 0, feedback: 'Strong opening', score: 90 },
        ],
      },
    };

    const parsed = reportFromSummary(validReport);
    expect(parsed).not.toBeNull();
    expect(parsed?.overallScore).toBe(85);
    expect(parsed?.summary).toContain('Great executive presentation');
  });

  it('returns null when report format is invalid', () => {
    const invalidReport = { coachingReport: { invalid: true } };
    expect(reportFromSummary(invalidReport)).toBeNull();
  });
});
