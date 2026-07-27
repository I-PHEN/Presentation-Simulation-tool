import { z } from 'zod';

export type DefenseMode = 'uninterrupted' | 'diagnostic' | 'mock';
export type ExaminerStance = 'supportive' | 'rigorous' | 'hostile';
export type CurveballFrequency = 'low' | 'medium' | 'high';
export type TranscriptRole = 'presenter' | 'examiner';

/** Per-session practice settings controlling hostile mode features. */
export interface PracticeSettings {
  curveballFrequency: CurveballFrequency;
  showRoomMood: boolean;
  showPersonaBadges: boolean;
}

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
  persona?: { id: string; title: string };
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

/** One analysed webcam frame, timestamped on the session clock. */
export interface DeliverySample {
  atMs: number;
  eyeContact: number;
  posture: number;
  presence: number;
}

/**
 * Aggregated camera evidence. Only ever present when enough frames actually
 * contained a person — see aggregateDelivery. `coverageMs` keeps the claim
 * proportionate to what the camera saw.
 */
export interface DeliveryMetrics {
  samples: number;
  eyeContact: number;
  posture: number;
  presence: number;
  coverageMs: number;
  lowMoments: { atMs: number; kind: 'eyeContact' | 'posture' }[];
}

export interface CoachingMetrics {
  paceWpm: number | null;
  fillerPerMin: number | null;
  verbatimSlides: number;
  slideTimes: { slideIndex: number; ms: number; atMs: number }[];
  questionsHandled: { handled: number; total: number };
  /** Topic (slide-free) sessions set this: slide-derived signals must be omitted. */
  deckless: boolean;
  /** Null whenever the camera was off or saw too little to be evidence. */
  delivery: DeliveryMetrics | null;
}

export type TimelineMomentKind = 'presenter' | 'question' | 'interrupt' | 'follow_up';

export interface TimelineMoment {
  atMs: number;
  kind: TimelineMomentKind;
  slideIndex: number;
  text: string;
  personaTitle?: string;
}

export interface PersonaChallenge {
  atMs: number;
  slideIndex: number;
  text: string;
  responded: boolean;
}

export interface PersonaVerdict {
  personaId: string;
  personaTitle: string;
  challenges: PersonaChallenge[];
  verdictLine: string | null;
}

export interface CoachingReport {
  highestLeverage: DefenseFinding;
  drills: string[];
  metrics: CoachingMetrics;
  timeline: TimelineMoment[];
  personaVerdicts: PersonaVerdict[];
  strengths: string[];
  minimal: boolean;
}

const coachingMetricsSchema = z.object({
  paceWpm: z.number().finite().nullable(),
  fillerPerMin: z.number().finite().nonnegative().nullable(),
  verbatimSlides: z.number().int().nonnegative(),
  slideTimes: z.array(z.object({ slideIndex: z.number().int().positive(), ms: z.number().finite().nonnegative(), atMs: z.number().finite().nonnegative() }).strict()),
  questionsHandled: z.object({ handled: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict(),
  deckless: z.boolean().default(false),
  // Defaulted so reports cached before camera support still parse.
  delivery: z.object({
    samples: z.number().int().nonnegative(),
    eyeContact: z.number().finite().min(0).max(100),
    posture: z.number().finite().min(0).max(100),
    presence: z.number().finite().min(0).max(100),
    coverageMs: z.number().finite().nonnegative(),
    lowMoments: z.array(z.object({ atMs: z.number().finite().nonnegative(), kind: z.enum(['eyeContact', 'posture']) }).strict()),
  }).strict().nullable().default(null),
}).strict();

const timelineMomentSchema = z.object({
  atMs: z.number().finite().nonnegative(),
  kind: z.enum(['presenter', 'question', 'interrupt', 'follow_up']),
  slideIndex: z.number().int().positive(),
  text: z.string(),
  personaTitle: z.string().optional(),
}).strict();

const personaVerdictSchema = z.object({
  personaId: z.string(),
  personaTitle: z.string(),
  challenges: z.array(z.object({ atMs: z.number().finite().nonnegative(), slideIndex: z.number().int().positive(), text: z.string(), responded: z.boolean() }).strict()),
  verdictLine: z.string().nullable(),
}).strict();

export const coachingReportSchema = z.object({
  highestLeverage: defenseFindingSchema,
  drills: z.array(z.string()),
  metrics: coachingMetricsSchema,
  timeline: z.array(timelineMomentSchema),
  personaVerdicts: z.array(personaVerdictSchema),
  strengths: z.array(z.string()),
  minimal: z.boolean(),
}).strict();
