import { describe, expect, it } from 'vitest';
import { createExaminerEventSchema } from './examiner';

describe('createExaminerEventSchema', () => {
  it('rejects events without a positive slide index or evidence', () => {
    expect(createExaminerEventSchema.safeParse({
      kind: 'interrupt', text: 'Please explain the rationale.', slideIndex: 0, evidence: '', occurredAtMs: 0,
    }).success).toBe(false);
  });

  it('does not treat the model control literal as an examiner event', () => {
    expect(createExaminerEventSchema.safeParse('NO_INTERRUPT').success).toBe(false);
  });
});
