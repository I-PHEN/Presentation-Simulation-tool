import { z } from 'zod';

export type DefenseMode = 'diagnostic' | 'mock';
export type ExaminerStance = 'supportive' | 'rigorous';
export type TranscriptRole = 'presenter' | 'examiner';

export interface TranscriptSegment {
  role: TranscriptRole;
  slideIndex: number;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
}

export interface ExaminerEvent {
  kind: 'interrupt' | 'question' | 'follow_up';
  text: string;
  slideIndex: number;
  evidence: string;
  occurredAtMs: number;
}

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

export const defenseFindingRiskSchema = z.enum(['high', 'medium', 'low']);
export type DefenseFindingRisk = z.infer<typeof defenseFindingRiskSchema>;
export const defenseFindingBasisSchema = z.enum(['slide_reliance', 'response_explanation']);
export type DefenseFindingBasis = z.infer<typeof defenseFindingBasisSchema>;

export interface DefenseFinding {
  title: string;
  risk: DefenseFindingRisk;
  basis: DefenseFindingBasis;
  presenterQuote: string;
  evidence: string;
  slideIndex: number;
  drill: string;
}

export interface DefenseEvidenceTrailItem {
  slideIndex: number;
  slideClaim: string;
  presenterSpeech: string;
  examinerEvent?: string;
  responseGap: string;
  drill: string;
}

export interface DefenseReport {
  highestLeverage: DefenseFinding;
  evidenceTrail: DefenseEvidenceTrailItem[];
  strengths: string[];
  slideReliance: { available: boolean; summary: string; evidence: ReadingEvidence[] };
  nextDrill: string;
}

const readingEvidenceSchema = z.object({ slideIndex: z.number().int().positive(), hasSpeech: z.boolean(), overlap: z.number().min(0).max(1), copiedPhrases: z.array(z.string()), explanationSignals: z.array(z.string()) }).strict();
export const defenseFindingSchema = z.object({ title: z.string().trim().min(1).max(180), risk: defenseFindingRiskSchema, basis: defenseFindingBasisSchema, presenterQuote: z.string().trim().min(1).max(2_000), evidence: z.string().trim().min(1).max(2_000), slideIndex: z.number().int().positive(), drill: z.string().trim().min(1).max(1_000) }).strict();
export const defenseEvidenceTrailSchema = z.object({ slideIndex: z.number().int().positive(), slideClaim: z.string(), presenterSpeech: z.string(), examinerEvent: z.string().optional(), responseGap: z.string(), drill: z.string() }).strict();
export const defenseReportSchema = z.object({ highestLeverage: defenseFindingSchema, evidenceTrail: z.array(defenseEvidenceTrailSchema).min(1), strengths: z.array(z.string()), slideReliance: z.object({ available: z.boolean(), summary: z.string(), evidence: z.array(readingEvidenceSchema) }).strict(), nextDrill: z.string().trim().min(1) }).strict();
