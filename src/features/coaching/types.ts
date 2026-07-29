export type CoachPersona = 'marcus' | 'sarah';

export type ExplanationDepth = 'surface' | 'balanced' | 'deep';

export interface SlideScriptData {
  openingHook: string;
  talkingPoints: string[];
  rescueScript: string;
}

export interface CoachingConfig {
  coachPersona: CoachPersona;
  presenterDirectives: string;
  explanationDepth: ExplanationDepth;
}

export interface DirectivesCheckitem {
  id: string;
  label: string;
  completed: boolean;
}
