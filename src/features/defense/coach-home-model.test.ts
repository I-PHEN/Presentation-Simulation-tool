import { describe, expect, it } from 'vitest';
import { buildCoachHomeModel } from './coach-home-model';

describe('buildCoachHomeModel', () => {
  it('gives a new student a first-plan action and a non-interactive challenge preview', () => {
    expect(buildCoachHomeModel([])).toMatchObject({
      nextPractice: {
        title: 'Build your first defense practice plan',
        actionLabel: 'Import your defense deck',
        href: '/decks/new',
      },
      programme: undefined,
      dailyChallenge: { title: 'Explain a difficult decision in 60 seconds', available: false },
    });
  });

  it('turns the newest active defense into a single practice recommendation', () => {
    const model = buildCoachHomeModel([{
      id: 'defense-1', title: 'Final thesis defense', status: 'practicing', mode: 'diagnostic', stance: 'rigorous',
      deck: { sourceName: 'Final-defense.pptx', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.jpg' }] },
      finding: { title: 'Make the opening claim defendable', evidence: 'The claim needs an explicit basis.', drill: 'State the evidence before the conclusion.' },
    }]);

    expect(model.nextPractice).toMatchObject({
      eyebrow: 'Thesis defense - resume',
      title: 'Make the opening claim defendable',
      actionLabel: 'Resume guided rehearsal',
      href: '/practice/defense-1?view=room',
    });
    expect(model.programme).toMatchObject({ title: 'Final thesis defense', slideCount: 1 });
  });

  it('uses a setup link for a defense that has not started and avoids score language', () => {
    const model = buildCoachHomeModel([{
      id: 'defense-2', title: 'Dissertation', status: 'upload', mode: 'diagnostic', stance: 'rigorous',
      deck: { sourceName: 'Dissertation.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.jpg' }] },
    }]);

    expect(model.nextPractice.href).toBe('/practice/defense-2?view=setup');
    expect(JSON.stringify(model)).not.toMatch(/score|readiness/i);
  });
});
