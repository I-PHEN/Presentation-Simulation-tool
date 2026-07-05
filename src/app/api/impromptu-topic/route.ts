import { NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

const fallbackTopics = [
  "Why every company should have a four-day work week",
  "The most underrated skill in tech is writing",
  "Remote work has made us worse communicators",
  "AI will not replace you, but someone using AI will",
  "The best ideas come from boredom, not brainstorming",
  "Failure is overrated — what we really need is recovery",
  "Why your side project is more important than your job",
  "The future of education is peer-to-peer, not institutional",
  "Privacy is a feature, not a bug",
  "The biggest risk is playing it safe",
  "Diversity in tech isn't a pipeline problem — it's a culture problem",
  "Why we should design for the worst day, not the best",
  "The most important metric is one you can't measure",
  "Great design is invisible",
  "Why conferences are a waste of time (and what to do instead)",
  "The gig economy is a stepping stone, not a destination",
  "Your competition is not who you think it is",
  "Why constraints make you more creative",
  "The myth of the self-made entrepreneur",
  "Feedback is a gift — but most people unwrap it wrong",
];

export async function GET() {
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You generate creative, thought-provoking presentation topics for impromptu speaking practice. Each topic should be controversial or opinion-based so the speaker has to take a stance. Topics should be relevant to business, tech, or professional life. Return ONLY the topic text, nothing else. Keep it to one sentence.' },
        { role: 'user', content: 'Give me one random impromptu presentation topic.' },
      ],
      thinking: { type: 'disabled' },
    });

    const topic = completion.choices[0]?.message?.content?.trim();
    if (topic && topic.length > 5 && topic.length < 200) {
      return NextResponse.json({ topic });
    }
  } catch {
    // Fall back to random local topic
  }

  const topic = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
  return NextResponse.json({ topic });
}
