import type { DeckContext } from '@/features/defense/types';

const CACHE_KEY = 'sharkpit_last_deck';

export function parseUploadedDeck(response: unknown): DeckContext | null {
  if (!response || typeof response !== 'object' || !('deck' in response)) return null;
  const deck = response.deck;
  if (!deck || typeof deck !== 'object' || !('sourceName' in deck) || !('slides' in deck)) return null;
  if (typeof deck.sourceName !== 'string' || !deck.sourceName.trim() || !Array.isArray(deck.slides)) return null;
  if (!deck.slides.every((slide) => slide && typeof slide === 'object' && 'index' in slide && 'text' in slide && 'imageUrl' in slide && Number.isInteger(slide.index) && slide.index > 0 && typeof slide.text === 'string' && typeof slide.imageUrl === 'string')) return null;
  const validDeck = { sourceName: deck.sourceName, slides: deck.slides as DeckContext['slides'] };
  cacheUploadedDeck(validDeck);
  return validDeck;
}

export function cacheUploadedDeck(deck: DeckContext): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(deck));
  } catch {
    /* ignore local storage errors */
  }
}

export function getCachedDeck(): DeckContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return parseUploadedDeck({ deck: JSON.parse(raw) });
  } catch {
    return null;
  }
}
