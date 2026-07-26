import { describe, expect, it } from 'vitest';
import { buildSessionOutcome, dimensionsFromMetrics, hasEvidence, paceScore } from './session-outcome';
import type { CoachingMetrics } from '@/features/defense/types';

const full: CoachingMetrics = { paceWpm: 135, fillerPerMin: 3, verbatimSlides: 1, slideTimes: [{ slideIndex: 1, ms: 1000, atMs: 0 }, { slideIndex: 2, ms: 1000, atMs: 2000 }], questionsHandled: { handled: 3, total: 4 }, deckless: false, delivery: null };

describe('paceScore', () => {
  it('scores the ideal band at 100 and falls off outside it', () => {
    expect(paceScore(135)).toBe(100);
    expect(paceScore(110)).toBe(100);
    expect(paceScore(160)).toBe(100);
    expect(paceScore(60)).toBe(0);
    expect(paceScore(220)).toBe(0);
    expect(paceScore(85)).toBe(50);
  });
});

describe('dimensionsFromMetrics', () => {
  it('derives 0-100 grounded dimensions from capture', () => {
    const d = dimensionsFromMetrics(full);
    expect(d.pace).toBe(100);
    expect(d.fluency).toBe(82); // 100 - 3*6 = 82
    expect(d.ownWords).toBe(50); // 100 - (1/2)*100
    expect(d.questionHandling).toBe(75); // 3/4
  });

  it('omits dimensions whose source metric is unavailable', () => {
    const d = dimensionsFromMetrics({ paceWpm: null, fillerPerMin: null, verbatimSlides: 0, slideTimes: [], questionsHandled: { handled: 0, total: 0 }, deckless: false, delivery: null });
    expect(d).toEqual({});
  });

  it('omits ownWords for a deckless (topic) session even though it has speaking time', () => {
    const d = dimensionsFromMetrics({ ...full, deckless: true });
    expect(d.ownWords).toBeUndefined();
    // The genuinely-measured dimensions still flow through.
    expect(d.pace).toBe(100);
    expect(d.fluency).toBe(82);
    expect(d.questionHandling).toBe(75);
  });

  it('omits every camera dimension when the camera produced no usable evidence', () => {
    const d = dimensionsFromMetrics(full); // delivery: null
    expect(d.eyeContact).toBeUndefined();
    expect(d.posture).toBeUndefined();
    expect(d.cameraPresence).toBeUndefined();
  });

  it('carries camera dimensions into the profile only when delivery evidence exists', () => {
    const d = dimensionsFromMetrics({
      ...full,
      delivery: { samples: 40, eyeContact: 72, posture: 64, presence: 80, coverageMs: 800_000, lowMoments: [] },
    });
    expect(d.eyeContact).toBe(72);
    expect(d.posture).toBe(64);
    expect(d.cameraPresence).toBe(80);
    // and the spoken dimensions are untouched by it
    expect(d.pace).toBe(100);
  });
});

describe('buildSessionOutcome + hasEvidence', () => {
  it('maps metrics + finding titles into a SessionOutcome', () => {
    const o = buildSessionOutcome({ sessionId: 's1', metrics: full, weaknessLabels: ['Rushing closings'], completedAt: '2026-07-23T00:00:00.000Z' });
    expect(o.sessionId).toBe('s1');
    expect(o.weaknesses).toEqual(['Rushing closings']);
    expect(o.dimensions.pace).toBe(100);
    expect(hasEvidence(o)).toBe(true);
  });

  it('hasEvidence is false when there are no dimensions and no weaknesses', () => {
    const o = buildSessionOutcome({ sessionId: 's1', metrics: { paceWpm: null, fillerPerMin: null, verbatimSlides: 0, slideTimes: [], questionsHandled: { handled: 0, total: 0 }, deckless: false, delivery: null }, weaknessLabels: [], completedAt: '2026-07-23T00:00:00.000Z' });
    expect(hasEvidence(o)).toBe(false);
  });
});
