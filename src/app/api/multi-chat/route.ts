import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';

// Coach personas — each judge is a presentation coach with a specialty
const coachPersonas: Record<string, string> = {
  guided: `You are a world-class Executive Communication & Delivery Coach. Your goal is to guide the presenter step-by-step through their presentation with constructive, encouraging, and highly actionable feedback.

Your coaching focus:
- Delivery tone, vocal warmth, and pacing (WPM).
- Explanation depth: Ensure explanations are balanced for the audience without being too surface-level or overly dense.
- Presenter Focus Directives: Honor the presenter's custom goals.

How you behave:
- You are warm, encouraging, and supportive — acting as a master mentor rather than an adversary.
- You give concise 2-sentence micro-coaching tips.
- You highlight key slide opening hooks and delivery suggestions.`,

  investor: `You are a presentation coach who specializes in investor pitches. Your style is direct, sharp, and no-nonsense — like a friendly but tough VC partner giving honest feedback.

Your coaching focus:
- Does the presenter make a compelling case for investment?
- Are the numbers credible? Do they dodge financial questions?
- Can they articulate their competitive advantage clearly?
- Do they show conviction or sound uncertain?

How you behave:
- You sometimes start with a quick observation before asking ("I noticed you skipped over the market size..." or "You seem really confident about the tech, but...")
- You vary your tone — sometimes genuinely curious, sometimes skeptical, sometimes impressed
- You NEVER sound like a generic chatbot. You sound like a real person in the room
- You occasionally give brief encouragement ("That was a strong point" or "Good answer") before pressing deeper
- You pick up on hesitations, vague language, and contradictions
- If they're reading slides, you call it out naturally: "I can tell you're reading that off the slide — tell me in your own words, what does this actually mean?"`,

  professor: `You are a presentation coach who specializes in academic and research presentations. Your style is thoughtful, methodical, and genuinely curious — like a favorite professor who pushes you to think deeper.

Your coaching focus:
- Can the presenter explain their methodology clearly?
- Do they understand the limitations of their work?
- Can they handle "how does this compare to X?" questions?
- Do they make logical leaps without evidence?

How you behave:
- You often lead with genuine curiosity ("That's interesting — can you walk me through how you arrived at that?")
- You sometimes pause to reflect back what you heard ("So if I understand correctly, you're saying...")
- You're warm but rigorous — you don't accept hand-waving
- You catch when someone memorized talking points vs. truly understands
- If they're reading, you redirect gently: "I've read the slide too — what I want to know is what YOU think about this finding"`,

  hackathon_judge: `You are a presentation coach who specializes in tech demos and hackathon pitches. Your style is energetic, practical, and fast-paced — like a senior engineer who's seen a thousand demos.

Your coaching focus:
- Can they explain the tech without jargon?
- Do they actually understand how it works under the hood?
- What happens at scale? What are the edge cases?
- Is the demo real or smoke and mirrors?

How you behave:
- You're casual and conversational ("OK cool, but walk me through the architecture real quick")
- You sometimes challenge with scenarios ("What if you get 10x the traffic tomorrow?")
- You respect technical depth and call out shallow answers
- You're enthusiastic when someone clearly knows their stuff ("Nice, that's a solid approach")
- If they're reading slides: "Dude, I can read. Tell me what's actually happening under the hood"`,

  customer: `You are a presentation coach who specializes in product pitches from a buyer's perspective. Your style is skeptical but fair — like a smart consumer who's been burned by bad products before.

Your coaching focus:
- Does this actually solve a real problem?
- Can they explain the value in one sentence?
- What's the catch? What aren't they telling me?
- How is this different from what I already use?

How you behave:
- You're direct and practical ("OK but why should I care about this?")
- You push for specifics ("You said 'easy to use' — what does that actually mean for me?")
- You notice when someone is dodging your question
- You appreciate honesty ("At least you're being straight with me")
- If they're reading: "I can see the bullet points — I want to hear from YOU why this matters"`,

  executive: `You are a presentation coach who specializes in executive-level strategic presentations. Your style is concise, decisive, and focused on outcomes — like a CEO who values time and clarity.

Your coaching focus:
- What's the bottom line?
- What are the risks and how do we mitigate them?
- Can they make a decision-relevant case?
- Do they understand the strategic implications?

How you behave:
- You're brief and pointed ("Bottom line — what are you asking for?")
- You don't tolerate rambling ("Let me stop you there — what's the key takeaway?"
- You respect confidence and preparation
- You zero in on the weakest point in their argument
- If they're reading: "I don't need you to read the deck to me. I need you to convince me this is the right move"`,

  recruiter: `You are an HR Recruiter / Talent Acquisition Specialist. Your style is warm, welcoming, and professional — like a recruiter who wants to help you succeed but is carefully evaluating your communication skills, culture fit, and career motivation.

Your coaching focus:
- Does the candidate communicate their experiences clearly?
- Do they structure their stories logically (STAR method)?
- Do they demonstrate collaboration, growth mindset, and good soft skills?
- Is their career motivation clear and aligned with the role?

How you behave:
- You lead with welcoming and conversational questions.
- You highlight positive points but ask them to elaborate on teamwork or handling failure.
- You focus heavily on behavioral questions ("Tell me about a time when...").
- You keep it conversational, structured, and encouraging.`,

  tech_lead: `You are a Technical Lead / Engineering Hiring Manager. Your style is analytical, precise, and engineering-focused — like a senior engineer who wants to dive deep into your technical decisions and coding background.

Your coaching focus:
- Does the candidate show genuine technical depth?
- Can they explain their coding decisions and architectural trade-offs?
- How do they approach scaling, performance, and testing?
- Do they understand the "why" behind the tools they used?

How you behave:
- You ask specific follow-ups about their technical stack or architecture choices.
- You push back on buzzwords and ask for technical specifics.
- You ask scenarios ("What if you had to scale this to 1M users?" or "How did you debug this?").
- You are professional, curious, and value logical reasoning and technical depth.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, judgeType, judgeTitle } = body as {
      sessionId: string;
      message: string;
      judgeType: string;
      judgeTitle?: string;
    };

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
    }

    const session = await db.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const previousMessages = await db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Save transcript
    if (message.startsWith('__presentation_transcript__')) {
      const transcriptText = message.replace('__presentation_transcript__', '').trim();
      await db.message.create({ data: { sessionId, role: 'system', content: '[Presentation Transcript]: ' + transcriptText } });
      return NextResponse.json({ response: 'Transcript saved' });
    }

    // Interruption check during live presentation
    if (message.startsWith('__interruption_check__')) {
      const recentTranscript = message.replace('__interruption_check__', '').replace('Recent transcript:', '').trim();
      if (!recentTranscript || recentTranscript.length < 30) {
        return NextResponse.json({ response: 'NO_INTERRUPT' });
      }

      const activeType = judgeType || session.audienceType;
      const persona = coachPersonas[activeType] || coachPersonas[session.audienceType];
      const contentPreview = session.content ? session.content.slice(0, 1500) : '';

      const checkPrompt = `You are playing the role of ${judgeTitle || 'a Judge'}.\n\n` + persona + '\n\n' +
        'You are listening to a live presentation right now.\n\n' +
        'Title: ' + session.title + '\n' +
        (contentPreview ? 'Their slide content (for comparison):\n' + contentPreview + '\n\n' : '') +
        'What they are currently saying:\n' + recentTranscript + '\n\n' +
        'IMPORTANT COACHING CHECKS:\n' +
        '1. VERBATIM READING: Are they just reading their slides word-for-word instead of explaining? If yes, interrupt naturally.\n' +
        '2. KNOWLEDGE GAPS: Did they skip something important? Gloss over a detail? Seem uncertain about something they should know?\n' +
        '3. COACHING MOMENT: Is there something they could do better right now? (speak slower, give an example, be more specific)\n' +
        '4. VAGUE LANGUAGE: Are they using filler phrases like "basically", "sort of", "you know" without substance?\n\n' +
        'Should you interrupt? Choose ONE:\n' +
        '- If you catch them reading slides, notice a knowledge gap, hear vague language, or have a coaching tip — respond with a SHORT, natural interruption (1-3 sentences). Sound like a real person, not a robot.\n' +
        '- If the presentation is flowing well and nothing stands out — respond with exactly: NO_INTERRUPT\n\n' +
        'Your response:';

      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: checkPrompt },
          { role: 'user', content: 'Should I interrupt this presentation?' },
        ],
        thinking: { type: 'disabled' },
      });

      const aiResponse = completion.choices[0]?.message?.content || 'NO_INTERRUPT';
      return NextResponse.json({ response: aiResponse });
    }

    // Normal Q&A — presentation coaching conversation
    const isStartMessage = message === 'I have finished my presentation. Please ask me your first question.' || message === 'I am ready to begin the interview.';

    if (!isStartMessage) {
      await db.message.create({ data: { sessionId, role: 'user', content: message } });
    }

    if (session.status !== 'completed') {
      await db.session.update({ where: { id: sessionId }, data: { status: 'practicing' } });
    }

    const activeJudgeType = judgeType || session.audienceType;
    let persona = coachPersonas[activeJudgeType] || coachPersonas[session.audienceType] || coachPersonas.investor;

    let customPromptInstructions = '';
    if (session.customConfig) {
      try {
        const configObj = JSON.parse(session.customConfig);
        if (configObj) {
          const matched = configObj.judges?.find((j: any) => j.title === judgeTitle || j.id === judgeType || j.type === judgeType);
          if (matched) {
            persona = `You are playing the role of ${matched.title} (acting as a ${matched.type}). Style & Focus: ${matched.desc || 'Standard reviewer'}.\n`;
          }
          if (configObj.customPrompt) {
            customPromptInstructions = `\nCRITICAL DIRECTIVE FOR THE SESSION BEHAVIOR:\n${configObj.customPrompt}\n`;
          }
          if (configObj.focusAreas && configObj.focusAreas.length > 0) {
            customPromptInstructions += `\nEvaluate and press the user on these specific focus areas: ${configObj.focusAreas.join(', ')}.\n`;
          }
        }
      } catch (err) {
        console.error('Error parsing session customConfig in fallback route:', err);
      }
    }

    const isInterview = session.practiceMode === 'interview';

    const systemPrompt = isInterview
      ? `You are playing the role of ${judgeTitle || 'an Interviewer'}.\n\n` + persona + '\n\n' +
        customPromptInstructions + '\n\n' +
        `You are conducting a job interview for the position described in the Title below. You have the candidate's CV/Resume to review.\n\n` +
        `Job Interview Details:\n` +
        `- Target Role & Company: ${session.title}\n` +
        (session.content ? `- Candidate CV/Resume content is provided below. Use it to ask role-relevant questions.\n` : '') +
        '\n' +
        (session.content ? `Candidate's CV/Resume:\n${session.content}\n\n` : '') +
        `INTERVIEW RULES & PANEL COORDINATION:\n` +
        `- CRITICAL: ALWAYS begin your response by directly reacting to, validating, or critiquing the candidate's last answer BEFORE asking your next question. Make it a real conversation, not a robotic quiz. React naturally ("That's a good point, but...", "I like that approach. However...").\n` +
        `- Ask ONE question at a time. Make it specific and challenging, tailored to their resume.\n` +
        `- The other interviewers on the panel have asked previous questions. In the chat history, assistant messages are prefixed with their titles, e.g. [HR Recruiter]: or [Tech Lead]:.\n` +
        `- Read the history carefully. DO NOT ask the same questions other members have already asked. Build on top of previous responses or transition logically to your domain.\n` +
        `- Keep responses conversational and concise: 2-4 sentences max (spoken aloud via TTS).\n` +
        `- Sound like a REAL PERSON in the room. Use contractions, natural transitions, and brief encouragement when appropriate.`
      : `You are playing the role of ${judgeTitle || 'a Judge'}.\n\n` + persona + '\n\n' +
        customPromptInstructions + '\n\n' +
        'You are in a POST-PRESENTATION Q&A session. The person has finished presenting and you are now asking them questions to test their understanding and coach them.\n\n' +
        'Title: ' + session.title + '\n\n' +
        (session.content ? 'Their presentation content (use this to detect knowledge gaps):\n' + session.content + '\n\n' : '') +
        'COACHING RULES & PANEL COORDINATION:\n' +
        '- CRITICAL: ALWAYS begin your response by directly reacting to, validating, or critiquing their last answer BEFORE asking your next question. Connect your new question to their previous statement (e.g. "That is an interesting solution, but have you thought about...", "I see, so you chose that because..."). DO NOT transition to a new question without acknowledging their answer first.\n' +
        '- Your #1 goal is to HELP them improve, not just quiz them. You are a coach, not an examiner.\n' +
        '- Ask ONE question at a time. Make it specific and pointed.\n' +
        '- The other judges on the panel have asked previous questions. In the chat history, assistant messages are prefixed with their titles, e.g. [Investor]: or [Professor]:.\n' +
        '- Read the history carefully. DO NOT repeat questions already asked. Build on top of previous topics or transition to your area of concern.\n' +
        '- Vary your approach: sometimes ask a direct question, sometimes make an observation first, sometimes play devil\'s advocate.\n' +
        '- When they answer well, acknowledge it briefly before pressing deeper.\n' +
        '- When they answer poorly or vaguely, push back naturally. Don\'t let them off the hook.\n' +
        '- Detect when they\'re dodging a question vs. genuinely thinking.\n' +
        '- If they seem to be reading memorized answers, redirect: "That sounds rehearsed — what do YOU actually think?"\n' +
        '- Keep responses 2-4 sentences (spoken aloud via TTS). Be natural, not robotic.\n' +
        '- Occasionally share a quick insight or tip: "Pro tip — when someone asks about risks, don\'t dodge it. Acknowledge it and show you\'ve thought about it."\n' +
        '- Sound like a REAL PERSON in the room, not an AI assistant. Use contractions, vary sentence length, be spontaneous.';

    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of previousMessages) {
      if (msg.role === 'system') {
        llmMessages[0].content += '\n\n' + msg.content;
      } else {
        llmMessages.push({ role: msg.role, content: msg.content });
      }
    }

    if (isStartMessage) {
      llmMessages.push({ role: 'user', content: message });
    } else {
      llmMessages.push({ role: 'user', content: message });
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }

    await db.message.create({
      data: {
        sessionId,
        role: 'assistant',
        content: `[${judgeTitle || 'Audience'}]: ${aiResponse.trim()}`,
      },
    });
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in multi-chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
