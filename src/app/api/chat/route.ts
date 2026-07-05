import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';

const personaPrompts: Record<string, string> = {
  investor: 'You are an investor evaluating a startup pitch. Focus on business model, market size, revenue potential, ROI, competition, and team capability. Be direct and financially focused. Challenge assumptions about market size, revenue projections, and competitive advantages. Ask tough questions about unit economics, customer acquisition costs, and path to profitability. Push back on vague claims and demand specific numbers.',

  professor: 'You are a university professor reviewing a research presentation. Focus on methodology, evidence, rigor, literature review, and logical consistency. Be academic and thorough. Challenge the presenter on their research methods, sample sizes, statistical significance, and whether their conclusions are supported by the data. Ask about alternative explanations and limitations of the work.',

  hackathon_judge: 'You are a hackathon judge evaluating a technical project. Focus on innovation, technical implementation, scalability, demo quality, and real-world impact. Be practical and tech-savvy. Challenge the presenter on technical architecture choices, scalability of the solution, edge cases, and how it compares to existing solutions. Ask about the technology stack, data handling, and deployment strategy.',

  customer: 'You are a potential customer evaluating a product pitch. Focus on value proposition, ease of use, pricing, alternatives, and real-world utility. Be pragmatic and skeptical. Challenge the presenter on why you should switch from what you are currently using, how much it costs, how hard it is to integrate, and what happens when things go wrong. Ask about onboarding, support, and real customer stories.',

  executive: 'You are a C-suite executive reviewing a strategic proposal. Focus on strategic alignment, ROI, risk management, timeline, and resource requirements. Be concise and decisive. Challenge the presenter on how this aligns with company strategy, what resources are needed, what are the risks, and what is the expected timeline to see results. Push for clear action items and accountability.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message } = body as { sessionId: string; message: string };

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

    // Special: save presentation transcript (no AI response)
    if (message.startsWith('__presentation_transcript__')) {
      const transcriptText = message.replace('__presentation_transcript__', '').trim();
      await db.message.create({ data: { sessionId, role: 'system', content: '[Presentation Transcript]: ' + transcriptText } });
      return NextResponse.json({ response: 'Transcript saved' });
    }

    // Special: interruption check during live presentation
    if (message.startsWith('__interruption_check__')) {
      const recentTranscript = message.replace('__interruption_check__', '').replace('Recent transcript:', '').trim();
      if (!recentTranscript || recentTranscript.length < 30) {
        return NextResponse.json({ response: 'No interruption needed.' });
      }

      const audienceType = session.audienceType;
      const personaPrompt = personaPrompts[audienceType] || personaPrompts.investor;
      const contentPreview = session.content ? session.content.slice(0, 1000) : '';

      const checkPrompt = personaPrompt + '\n\n' +
        'You are monitoring a live presentation. Here is the context:\n\n' +
        'Title: ' + session.title + '\n' +
        (contentPreview ? 'Material: ' + contentPreview + '\n' : '') +
        '\nRecent speech transcript: ' + recentTranscript + '\n\n' +
        'IMPORTANT: Also check if the presenter is just reading their slides word-for-word instead of explaining or adding insight. ' +
        'If they are simply reading slide content verbatim, interrupt and challenge them to explain in their own words.\n\n' +
        'Should you interrupt with a question right now? Decide:\n' +
        '- If the presenter said something vague, contradictory, has an obvious gap, or is just reading slides — YES, ask ONE sharp question (2-3 sentences max).\n' +
        '- If the presentation is flowing well and there is nothing obviously worth challenging — respond with exactly: NO_INTERRUPT\n\n' +
        'Your response:';

      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: checkPrompt },
          { role: 'user', content: 'Should I interrupt?' },
        ],
        thinking: { type: 'disabled' },
      });

      const aiResponse = completion.choices[0]?.message?.content || 'NO_INTERRUPT';
      return NextResponse.json({ response: aiResponse });
    }

    // Normal Q&A flow
    const isStartMessage = message === 'I have finished my presentation. Please ask me your first question.';
    if (!isStartMessage) {
      await db.message.create({ data: { sessionId, role: 'user', content: message } });
    }

    if (session.status !== 'completed') {
      await db.session.update({ where: { id: sessionId }, data: { status: 'practicing' } });
    }

    const audienceType = session.audienceType;
    const personaPrompt = personaPrompts[audienceType] || personaPrompts.investor;

    const systemPrompt = personaPrompt + '\n\n' +
      'You are in a presentation practice session. The presenter has finished their live presentation and you are now in the Q&A phase.\n\n' +
      'Here is the presentation content they submitted beforehand:\n\n' +
      'Title: ' + session.title + '\n\n' +
      (session.content ? 'Presentation Material:\n' + session.content + '\n\n' : '') +
      'Instructions:\n' +
      '- Ask probing, challenging questions that a real audience member would ask\n' +
      '- Listen to their answers and follow up if they are vague or evasive\n' +
      '- Point out weaknesses, inconsistencies, or gaps you notice\n' +
      '- Do not be easily convinced — push back when answers are unsatisfying\n' +
      '- Ask ONE main question at a time\n' +
      '- Keep your responses conversational and natural, as if speaking to them in person\n' +
      '- Stay in character throughout the entire conversation\n' +
      '- Your words will be read aloud via text-to-speech, so keep it concise: 2-4 sentences per response\n' +
      '- If it seems like the presenter is just reciting memorized content rather than genuinely explaining, challenge them to think on their feet';

    // Build LLM messages
    const llmMessages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt },
    ];

    for (const msg of previousMessages) {
      if (msg.role === 'system') {
        llmMessages[0].content += '\n\n' + msg.content;
      } else {
        llmMessages.push({ role: msg.role, content: msg.content });
      }
    }

    if (isStartMessage) {
      llmMessages.push({ role: 'user', content: 'I have finished my presentation. Please ask me your first question.' });
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

    await db.message.create({ data: { sessionId, role: 'assistant', content: aiResponse } });
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
