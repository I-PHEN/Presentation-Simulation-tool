import { describe, expect, it } from 'vitest';
import { reportFromSummary } from './page';

describe('reportFromSummary', () => {
  it('treats a shallow cached report missing strengths and reliance as absent', () => {
    expect(reportFromSummary({ defenseReport: { highestLeverage: {}, evidenceTrail: [], nextDrill: 'Retry' } })).toBeNull();
  });
});
