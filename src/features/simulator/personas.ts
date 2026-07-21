// The known-good Cartesia Sonic voice id (see plan Global Constraints). Distinct
// per-persona voice ids are a later config fill; this is the single seam.
const DEFAULT_VOICE = 'd46abd1d-2d02-43e8-819f-51fb652c1c61';

export interface Persona {
  id: 'professor' | 'examiner' | 'peer';
  title: string;
  focus: string;
  promptFragment: string;
  voiceId: string;
}

export const PERSONAS: Record<Persona['id'], Persona> = {
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

export function assemblePanel(): Persona[] {
  return [PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer];
}
