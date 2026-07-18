export type DefenseMode = 'diagnostic' | 'mock';

export interface SlideContext {
  index: number;
  text: string;
  imageUrl: string;
}

export interface DeckContext {
  sourceName: string;
  slides: SlideContext[];
}

export interface ReadingEvidence {
  slideIndex: number;
  hasSpeech: boolean;
  overlap: number;
  copiedPhrases: string[];
  explanationSignals: string[];
}

export interface DefenseFinding {
  title: string;
  risk: string;
  evidence: string;
  slideIndex: number;
  drill: string;
}
