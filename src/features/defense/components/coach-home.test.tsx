import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoachHome } from './coach-home';

const model = {
  nextPractice: {
    eyebrow: 'Thesis defense - next session',
    title: 'Make the opening claim defendable',
    summary: 'State the evidence before the conclusion.',
    actionLabel: 'Start guided rehearsal',
    href: '/practice/s1?view=setup',
    duration: '12 min',
  },
  trajectory: {
    label: 'Your trajectory',
    detail: 'Two defense sessions are recorded.',
    milestone: 'Practise the claim, evidence, and conclusion in order.',
  },
  programme: {
    title: 'Final thesis defense',
    sourceName: 'Final-defense.pptx',
    slideCount: 12,
    href: '/practice/s1?view=setup',
  },
  dailyChallenge: {
    title: 'Explain a difficult decision in 60 seconds',
    target: 'Clarity and structure',
    duration: '3 min',
    available: false as const,
  },
};

describe('CoachHome', () => {
  it('renders one dominant next-practice action with quiet coaching context', () => {
    const html = renderToStaticMarkup(<CoachHome name="Michael" model={model} />);

    expect(html).toContain('Good to see you, Michael.');
    expect(html).toContain('Your next best practice');
    expect(html).toContain('Start guided rehearsal');
    expect(html).toContain('Your trajectory');
    expect(html).toContain('Daily speaking challenge');
    expect(html).not.toMatch(/Overall Score|Practice History|AI Panel Members/);

    const dailyChallengePreview = html.match(
      /<section data-testid="daily-challenge-preview"[^>]*>(.*?)<\/section>/,
    );
    expect(dailyChallengePreview?.[1]).not.toContain('href=');
  });

  it('uses a first-plan action when there is no active programme', () => {
    const html = renderToStaticMarkup(
      <CoachHome
        name="Michael"
        model={{
          ...model,
          programme: undefined,
          nextPractice: {
            ...model.nextPractice,
            actionLabel: 'Import your defense deck',
            href: '/decks/new',
          },
        }}
      />,
    );

    expect(html).toContain('Import your defense deck');
    expect(html).not.toContain('Final thesis defense');
  });
});
