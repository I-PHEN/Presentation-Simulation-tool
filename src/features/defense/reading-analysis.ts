import type { ReadingEvidence, SlideContext } from './types';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'their',
  'them',
  'these',
  'they',
  'this',
  'those',
  'to',
  'was',
  'we',
  'were',
  'with',
]);

const EXPLANATION_SIGNALS = ['because', 'for example', 'which means', 'in practice'];
const NGRAM_LENGTH = 5;
const MAX_EXPLANATION_CREDIT = 10;

function normalisedTerms(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => !STOP_WORDS.has(term)) ?? [];
}

function phrases(terms: string[], length = NGRAM_LENGTH): string[] {
  if (terms.length === 0 || length === 0) {
    return [];
  }

  if (terms.length > 0 && terms.length < length) {
    return [terms.join(' ')];
  }

  const result: string[] = [];

  for (let index = 0; index <= terms.length - length; index += 1) {
    result.push(terms.slice(index, index + length).join(' '));
  }

  return result;
}

function findExplanationSignals(speech: string): string[] {
  const normalisedSpeech = speech.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  return EXPLANATION_SIGNALS.filter((signal) => normalisedSpeech.includes(signal));
}

export function analyseReading(
  slides: SlideContext[],
  spokenBySlide: Record<number, string>,
): ReadingEvidence[] {
  return slides.map((slide) => {
    const slideTerms = normalisedTerms(slide.text);
    const phraseLength = Math.min(NGRAM_LENGTH, slideTerms.length);
    const slidePhrases = phrases(slideTerms, phraseLength);
    const speech = spokenBySlide[slide.index] ?? '';
    const hasSpeech = normalisedTerms(speech).length > 0;
    const spokenPhrases = new Set(phrases(normalisedTerms(speech), phraseLength));
    const copiedPhrases = slidePhrases.filter((phrase) => spokenPhrases.has(phrase));

    return {
      slideIndex: slide.index,
      hasSpeech,
      overlap: slidePhrases.length === 0 ? 0 : copiedPhrases.length / slidePhrases.length,
      copiedPhrases,
      explanationSignals: findExplanationSignals(speech),
    };
  });
}

export function readingScore(evidence: ReadingEvidence[]): number {
  const spokenEvidence = evidence.filter((item) => item.hasSpeech);

  if (spokenEvidence.length === 0) {
    return 100;
  }

  const averageOverlap = spokenEvidence.reduce((total, item) => total + item.overlap, 0) / spokenEvidence.length;
  const explanationCredit = Math.min(
    MAX_EXPLANATION_CREDIT,
    spokenEvidence.reduce(
      (total, item) => total + (item.overlap < 0.5 ? item.explanationSignals.length * 5 : 0),
      0,
    ),
  );

  return Math.round(Math.min(100, Math.max(0, (1 - averageOverlap) * 100 + explanationCredit)));
}
