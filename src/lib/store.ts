import { create } from 'zustand';

export interface TranscriptEntry {
  role: 'presenter' | 'judge';
  judgeId?: string;
  content: string;
  timestamp: number;
}

export interface Judge {
  id: string;
  icon: string;
  title: string;
  type: string;
  voice: string;
}

export interface Scores {
  clarity: number;
  confidence: number;
  technical: number;
  storytelling: number;
  persuasiveness: number;
  conciseness: number;
  verbatimReading: number;
  eyeContact: number;
  posture: number;
  cameraPresence: number;
  overall: number;
}

export type PracticeMode = 'full' | 'pitch' | 'impromptu' | 'lecture' | 'interview';

export const practiceModeConfig: Record<PracticeMode, { label: string; desc: string; timeLimit: number | null; needsSlides: boolean }> = {
  full: { label: 'Full Presentation', desc: 'No time limit', timeLimit: null, needsSlides: false },
  pitch: { label: '3-Minute Pitch', desc: 'Elevator pitch', timeLimit: 180, needsSlides: false },
  impromptu: { label: 'Impromptu', desc: 'Random topic, 2 min', timeLimit: 120, needsSlides: false },
  lecture: { label: 'Lecture Mode', desc: 'Teach a class', timeLimit: null, needsSlides: false },
  interview: { label: 'Interview Mode', desc: 'Job interview simulation', timeLimit: null, needsSlides: false },
};

// Voice mapping for each judge type — all IDs verified against Cartesia API
export const JUDGE_VOICE_MAP: Record<string, string> = {
  investor:        '820a3788-2b37-4d21-847a-b65d8a68c99a', // Tyler - Friendly Salesman (direct, confident)
  professor:       'aec42b73-8c46-4528-a377-537b5ecb8e7b', // Warren - Seasoned Pragmatist (authoritative, thoughtful)
  hackathon_judge: '710feaa3-b550-42f3-b3eb-6f37f2a7cc0a', // Tanner - Upbeat Assistant (energetic, casual)
  customer:        'a7a59115-2425-4192-844c-1e98ec7d6877', // Amber - Warm Support Agent (skeptical but fair)
  executive:       '533b2990-5b82-45a4-b9f2-367776972ca6', // Reed - Polished Professional (concise, decisive)
  student:         '62ae83ad-4f6a-430b-af41-a9bede9286ca', // Gemma - Decisive Agent (curious, engaged)
  recruiter:       'a7a59115-2425-4192-844c-1e98ec7d6877', // Amber - Warm Support Agent (for recruiter)
  tech_lead:       '710feaa3-b550-42f3-b3eb-6f37f2a7cc0a', // Tanner - Upbeat Assistant (for tech lead)
};

export function getVoiceForJudge(judgeType: string): string {
  return JUDGE_VOICE_MAP[judgeType] || 'd46abd1d-2d02-43e8-819f-51fb652c1c61'; // Grant - neutral American English fallback
}

export type InputMode = 'upload' | 'screen';

// Step mapping:
// 1 = Upload / Setup
// 2 = Configure (audience + AI behavior + mode)
// 3 = Present
// 4 = Q&A
// 5 = Results

interface CameraMetrics {
  eyeContact: number;
  posture: number;
  presence: number;
  frames: number;
}

interface ScreenContext {
  description: string;
  updatedAt: number;
}

interface AppState {
  step: number;
  setStep: (step: number) => void;

  // Input mode: upload slides or screen share
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  // Upload
  title: string;
  content: string;
  hasContent: boolean;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setHasContent: (v: boolean) => void;

  // Slides
  slides: string[];
  currentSlide: number;
  totalSlides: number;
  setSlides: (slides: string[]) => void;
  setCurrentSlide: (n: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;

  // Audience
  audienceType: string;
  setAudienceType: (type: string) => void;

  // Multi-agent judges
  judges: Judge[];
  setJudges: (judges: Judge[]) => void;

  // Audience count (for lecture mode and others)
  audienceCount: number;
  setAudienceCount: (count: number) => void;

  // Live Reactions
  activeHandRaised: string | null;
  setActiveHandRaised: (id: string | null) => void;
  judgeReactions: Record<string, string>;
  setJudgeReaction: (judgeId: string, reaction: string) => void;

  // Interruption mode
  interruptionMode: 'during' | 'after';
  setInterruptionMode: (mode: 'during' | 'after') => void;

  // Practice mode
  practiceMode: PracticeMode;
  setPracticeMode: (mode: PracticeMode) => void;
  impromptuTopic: string;
  setImpromptuTopic: (topic: string) => void;

  // Interview settings
  targetRole: string;
  targetCompany: string;
  interviewStyle: 'behavioral' | 'technical' | 'case';
  interviewStrictness: 'friendly' | 'rigorous';
  setTargetRole: (role: string) => void;
  setTargetCompany: (company: string) => void;
  setInterviewStyle: (style: 'behavioral' | 'technical' | 'case') => void;
  setInterviewStrictness: (strictness: 'friendly' | 'rigorous') => void;

  // Session
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Presentation phase
  presentationTranscript: string;
  setPresentationTranscript: (t: string) => void;
  appendPresentationTranscript: (t: string) => void;

  // Real-time metrics
  wordsPerMinute: number;
  setWordsPerMinute: (wpm: number) => void;
  fillerWordCount: number;
  setFillerWordCount: (count: number) => void;
  fillerWords: Array<{ word: string; count: number }>;
  setFillerWords: (words: Array<{ word: string; count: number }>) => void;

  // Camera metrics (real-time during presentation)
  cameraMetrics: CameraMetrics;
  setCameraMetrics: (metrics: CameraMetrics) => void;
  updateCameraFrame: (eyeContact: number, posture: number, presence: number) => void;

  // Screen context (what's on screen during screen share)
  screenContext: ScreenContext;
  setScreenContext: (desc: string) => void;

  // Q&A phase
  transcript: TranscriptEntry[];
  addTranscript: (role: 'presenter' | 'judge', content: string, judgeId?: string) => void;
  clearTranscript: () => void;

  // Scoring
  scores: Scores | null;
  feedback: string;
  weaknesses: string[];
  recommendations: string[];
  knowledgeGaps: string[];
  judgeFeedback: Array<{ judgeType: string; icon: string; title: string; feedback: string }>;
  setScores: (scores: Scores) => void;
  setFeedback: (feedback: string) => void;
  setWeaknesses: (weaknesses: string[]) => void;
  setRecommendations: (recommendations: string[]) => void;
  setKnowledgeGaps: (gaps: string[]) => void;
  setJudgeFeedback: (feedback: Array<{ judgeType: string; icon: string; title: string; feedback: string }>) => void;

  // Loading
  isAnalyzing: boolean;
  isScoring: boolean;
  setIsAnalyzing: (v: boolean) => void;
  setIsScoring: (v: boolean) => void;

  // Reset
  reset: () => void;

  customConfig: string | null;
  setCustomConfig: (config: string | null) => void;

  recordSession: boolean;
  setRecordSession: (v: boolean) => void;
}

const initialState = {
  step: 1,
  inputMode: 'upload' as InputMode,
  title: '',
  content: '',
  customConfig: null as string | null,
  hasContent: false,
  slides: [] as string[],
  currentSlide: 0,
  totalSlides: 0,
  audienceType: '',
  judges: [] as Judge[],
  audienceCount: 3,
  activeHandRaised: null as string | null,
  judgeReactions: {} as Record<string, string>,
  interruptionMode: 'after' as 'during' | 'after',
  practiceMode: 'full' as PracticeMode,
  impromptuTopic: '',
  targetRole: '',
  targetCompany: '',
  interviewStyle: 'behavioral' as 'behavioral' | 'technical' | 'case',
  interviewStrictness: 'friendly' as 'friendly' | 'rigorous',
  sessionId: null as string | null,
  presentationTranscript: '',
  wordsPerMinute: 0,
  fillerWordCount: 0,
  fillerWords: [] as Array<{ word: string; count: number }>,
  cameraMetrics: { eyeContact: 0, posture: 0, presence: 0, frames: 0 } as CameraMetrics,
  screenContext: { description: '', updatedAt: 0 } as ScreenContext,
  transcript: [] as TranscriptEntry[],
  scores: null as Scores | null,
  feedback: '',
  weaknesses: [] as string[],
  recommendations: [] as string[],
  knowledgeGaps: [] as string[],
  judgeFeedback: [] as Array<{ judgeType: string; icon: string; title: string; feedback: string }>,
  isAnalyzing: false,
  isScoring: false,
  recordSession: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  setHasContent: (v) => set({ hasContent: v }),

  setSlides: (slides) => set({ slides, totalSlides: slides.length, currentSlide: 0 }),
  setCurrentSlide: (n) => set({ currentSlide: n }),
  nextSlide: () => {
    const s = get();
    if (s.currentSlide < s.totalSlides - 1) set({ currentSlide: s.currentSlide + 1 });
  },
  prevSlide: () => {
    const s = get();
    if (s.currentSlide > 0) set({ currentSlide: s.currentSlide - 1 });
  },

  setAudienceType: (type) => set({ audienceType: type }),
  setJudges: (judges) => set({ judges }),
  setAudienceCount: (count) => set({ audienceCount: count }),
  setActiveHandRaised: (id) => set({ activeHandRaised: id }),
  setJudgeReaction: (judgeId, reaction) => 
    set((state) => ({ judgeReactions: { ...state.judgeReactions, [judgeId]: reaction } })),
  setInterruptionMode: (mode) => set({ interruptionMode: mode }),
  setPracticeMode: (mode) => set({ practiceMode: mode }),
  setImpromptuTopic: (topic) => set({ impromptuTopic: topic }),
  setTargetRole: (role) => set({ targetRole: role }),
  setTargetCompany: (company) => set({ targetCompany: company }),
  setInterviewStyle: (style) => set({ interviewStyle: style }),
  setInterviewStrictness: (strictness) => set({ interviewStrictness: strictness }),
  setSessionId: (id) => set({ sessionId: id }),

  setPresentationTranscript: (t) => set({ presentationTranscript: t }),
  appendPresentationTranscript: (t) =>
    set((state) => ({ presentationTranscript: state.presentationTranscript + ' ' + t })),

  setWordsPerMinute: (wpm) => set({ wordsPerMinute: wpm }),
  setFillerWordCount: (count) => set({ fillerWordCount: count }),
  setFillerWords: (words) => set({ fillerWords: words }),

  setCameraMetrics: (metrics) => set({ cameraMetrics: metrics }),
  updateCameraFrame: (eyeContact, posture, presence) =>
    set((state) => {
      const newFrames = state.cameraMetrics.frames + 1;
      const avg = (prev: number, next: number) => newFrames === 1 ? next : Math.round(prev * (newFrames - 1) / newFrames + next / newFrames);
      return {
        cameraMetrics: {
          eyeContact: avg(state.cameraMetrics.eyeContact, eyeContact),
          posture: avg(state.cameraMetrics.posture, posture),
          presence: avg(state.cameraMetrics.presence, presence),
          frames: newFrames,
        },
      };
    }),

  setScreenContext: (desc) => set({ screenContext: { description: desc, updatedAt: Date.now() } }),

  addTranscript: (role, content, judgeId) =>
    set((state) => ({ transcript: [...state.transcript, { role, content, judgeId, timestamp: Date.now() }] })),
  clearTranscript: () => set({ transcript: [] }),

  setScores: (scores) => set({ scores }),
  setFeedback: (feedback) => set({ feedback }),
  setWeaknesses: (weaknesses) => set({ weaknesses }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setKnowledgeGaps: (knowledgeGaps) => set({ knowledgeGaps }),
  setJudgeFeedback: (judgeFeedback) => set({ judgeFeedback }),

  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setIsScoring: (v) => set({ isScoring: v }),

  setCustomConfig: (config) => set({ customConfig: config }),
  setRecordSession: (v) => set({ recordSession: v }),

  reset: () => set({ ...initialState, customConfig: null }),
}));
