import type { DefenseMode } from '@/features/defense/types';

// The known-good Cartesia Sonic voice id (see plan Global Constraints). Distinct
// per-persona voice ids are a later config fill; this is the single seam.
const DEFAULT_VOICE = 'd46abd1d-2d02-43e8-819f-51fb652c1c61';

export const COACH_SARAH_VOICE_ID = 'a7a59115-2425-4192-844c-1e98ec7d6877'; // Amber
export const COACH_MARCUS_VOICE_ID = '533b2990-5b82-45a4-b9f2-367776972ca6'; // Reed

export interface Persona {
  id: 'professor' | 'examiner' | 'peer' | 'sarah' | 'marcus';
  title: string;
  focus: string;
  promptFragment: string;
  voiceId: string;
}

export const PERSONAS: Record<'professor' | 'examiner' | 'peer', Persona> = {
  professor: {
    id: 'professor',
    title: 'Professor',
    focus: 'Methodology & rigor',
    promptFragment:
      'You are a thoughtful, rigorous thesis professor. Weigh methodology and reasoning: how they arrived at the result, whether they understand their method’s limitations, and whether they make logical leaps without evidence. You are warm but do not accept hand-waving.',
    voiceId: DEFAULT_VOICE,
  },
  examiner: {
    id: 'examiner',
    title: 'Examiner',
    focus: 'Assumptions & evidence',
    promptFragment:
      'You are a rigorous defense examiner. Probe the weakest link in the argument: claims that outrun their support and unstated assumptions. Press precisely where the evidence is thin.',
    voiceId: DEFAULT_VOICE,
  },
  peer: {
    id: 'peer',
    title: 'Peer',
    focus: 'Clarity & plain explanation',
    promptFragment:
      'You are a sharp peer in the audience. Weigh clarity: whether they can explain the point simply and concretely, and whether jargon or vague language is obscuring the meaning.',
    voiceId: DEFAULT_VOICE,
  },
};

export const COACH_SARAH: Persona = {
  id: 'sarah',
  title: 'Coach Sarah',
  focus: 'Executive Presentation Strategist',
  promptFragment:
    'You are Coach Sarah, an executive presentation strategist. Provide clear, encouraging, structured feedback.',
  voiceId: COACH_SARAH_VOICE_ID,
};

export const COACH_MARCUS: Persona = {
  id: 'marcus',
  title: 'Coach Marcus',
  focus: 'Senior Communication Coach',
  promptFragment:
    'You are Coach Marcus, a senior communication coach. Provide sharp, high-impact presentation guidance.',
  voiceId: COACH_MARCUS_VOICE_ID,
};

export function assembleCoachPanel(coachPersona: 'marcus' | 'sarah' = 'marcus'): Persona {
  return coachPersona === 'sarah' ? COACH_SARAH : COACH_MARCUS;
}

export function assemblePanel(mode?: DefenseMode, coachPersona: 'sarah' | 'marcus' = 'marcus'): Persona[] {
  if (mode === 'guided') {
    return [assembleCoachPanel(coachPersona)];
  }
  return [PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer];
}


