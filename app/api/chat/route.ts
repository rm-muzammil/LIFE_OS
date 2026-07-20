import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, dailySchedule } from '@/db/schema';
import { desc, gte } from 'drizzle-orm';
import { todayPKT } from '@/lib/time';
import { callGemini, GeminiError } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(chatMessages)
      .where(gte(chatMessages.date, cutoff))
      .orderBy(chatMessages.createdAt);

    return NextResponse.json(
      { messages: rows },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  } catch (err) {
    console.error('chat GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

interface PostBody {
  content: string;
  feedsSchedule?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PostBody;
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const date = todayPKT();
    const feedsSchedule = body.feedsSchedule ?? true;

    const [userMsg] = await db
      .insert(chatMessages)
      .values({ role: 'user', content: body.content.trim(), date, feedsSchedule })
      .returning();

    // Context for the assistant's reply: last 10 messages + today's schedule status.
    const recent = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);

    const todayRows = await db
      .select()
      .from(dailySchedule)
      .where(gte(dailySchedule.date, date))
      .limit(1);

    const scheduleSummary = todayRows[0]
      ? JSON.stringify(todayRows[0].tasks)
      : '(no schedule generated yet today)';

    const history = recent
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `You are the Self-Khilafah personal assistant chat for a Muslim man in Pakistan (PKT timezone).
You can: answer questions about today's schedule, accept task additions ("add gym at 4pm"),
accept priority/time change requests ("move deep work to morning"), and take general notes.
You do not directly edit the schedule yourself — your reply is shown to the user as a message,
and anything useful gets folded into tomorrow's AI-generated schedule automatically.
Keep replies short, direct, practical. No flattery, no filler.

TODAY'S SCHEDULE (JSON):
${scheduleSummary}

RECENT CONVERSATION:
${history}

Reply to the latest user message now, as the assistant, in plain text (no markdown, no JSON).`;

    let replyText: string;
    try {
      replyText = (await callGemini(prompt, { temperature: 0.6 })).trim();
    } catch (err) {
      replyText =
        err instanceof GeminiError
          ? "I couldn't reach the AI right now, but I've saved your message — it'll still feed into tomorrow's schedule."
          : "Something went wrong generating a reply, but your message was saved.";
    }

    const [assistantMsg] = await db
      .insert(chatMessages)
      .values({ role: 'assistant', content: replyText, date, feedsSchedule: false })
      .returning();

    return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg });
  } catch (err) {
    console.error('chat POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
