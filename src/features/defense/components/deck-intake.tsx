import type { DeckContext } from '@/features/defense/types';

export function parseUploadedDeck(response: unknown): DeckContext | null {
  if (!response || typeof response !== 'object' || !('deck' in response)) return null;
  const deck = response.deck;
  if (!deck || typeof deck !== 'object' || !('sourceName' in deck) || !('slides' in deck)) return null;
  if (typeof deck.sourceName !== 'string' || !deck.sourceName.trim() || !Array.isArray(deck.slides)) return null;
  if (!deck.slides.every((slide) => slide && typeof slide === 'object' && 'index' in slide && 'text' in slide && 'imageUrl' in slide && Number.isInteger(slide.index) && slide.index > 0 && typeof slide.text === 'string' && typeof slide.imageUrl === 'string')) return null;
  return { sourceName: deck.sourceName, slides: deck.slides as DeckContext['slides'] };
}
