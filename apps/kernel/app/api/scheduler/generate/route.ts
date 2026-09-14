import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, dailySchedule, chatMessages, prayerTimes } from '@/db/schema';
import { eq, gte, and, desc } from 'drizzle-orm';
import { todayPKT, nowPKT, isFromToday } from '@/lib/time';
import { callGemini, getUserGeminiKeys, parseJsonResponse, GeminiError } from '@/lib/gemini';
import { buildProvinceContext, extractPendingTaskHints, buildSchedulerPrompt } from '@/lib/scheduler';
import { getApiUserId } from '@/lib/auth';
import type { ScheduledTask, PrayerTimesConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_PRAYER_TIMES: PrayerTimesConfig = {
  fajr: '05:20',
  dhuhr: '13:00',
  asr: '16:45',
  maghrib: '19:30',
  isha: '21:00',
};

function isFridayPKT(d: Date): boolean {
  return d.getDay() === 5;
}
function isFastDayPKT(d: Date): boolean {
  const day = d.getDay(); // 0=Sun ... 1=Mon, 4=Thu
  return day === 1 || day === 4;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const body = await req.json().catch(() => ({}));

  // Two ways to reach this route now that schedules are per-user:
  //  1. Browser call (manual "Regenerate" button on /schedule) — no auth
  //     header, resolved from the signed-in session cookie.
  //  2. Server-to-server call (from /api/cron/generate-schedule, looping over
  //     every user) — must present SCHEDULER_API_SECRET and pass userId
  //     explicitly in the body, since a cron request has no session.
  // NOTE: this makes SCHEDULER_API_SECRET effectively required for the cron
  // path to work in multi-user mode — without it, cron-triggered generation
  // returns 401 (the manual browser button is unaffected either way).
  let userId: string;
  if (authHeader) {
    if (!process.env.SCHEDULER_API_SECRET || authHeader !== `Bearer ${process.env.SCHEDULER_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!body?.userId || typeof body.userId !== 'string') {
      return NextResponse.json({ error: 'userId is required for server-to-server calls' }, { status: 400 });
    }
    userId = body.userId;
  } else {
    const sessionUserId = await getApiUserId();
    if (!sessionUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = sessionUserId;
  }

  // `force: true` = manual "Regenerate" button, always runs.
  // Omitted/false = cron-triggered call (including the Hobby-tier "retry" cron
  // an hour later) — skips work if today already generated successfully, so
  // the retry cron can't clobber a schedule that already succeeded.
  const force = Boolean(body?.force);

  const date = todayPKT();
  const now = nowPKT();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const isFriday = isFridayPKT(now);
  const isFastDay = isFastDayPKT(now);

  try {
    if (!force) {
      const existing = await db
        .select()
        .from(dailySchedule)
        .where(and(eq(dailySchedule.userId, userId), eq(dailySchedule.date, date)))
        .limit(1);
      if (existing[0] && existing[0].status === 'active' && !existing[0].generationError) {
        return NextResponse.json({ date, skipped: true, reason: 'already generated today' });
      }
    }

    let provRows = await db
      .select()
      .from(provinces)
      .where(and(eq(provinces.userId, userId), eq(provinces.active, true)));

    // Self-heal: if pull-provinces hasn't run yet today (or failed), pull now
    // rather than trusting cron ordering — Vercel Hobby only guarantees the
    // scheduled *hour*, not the minute, so we can't rely on pull-provinces
    // having already run before this fires. This pulls for ALL users (the
    // cron route already loops every active province across every user), not
    // just this one — a little extra work, but keeps the self-heal simple.
    const anyStale = provRows.some((p) => !isFromToday(p.cachedAt));
    if (anyStale) {
      try {
        await fetch(`${req.nextUrl.origin}/api/cron/pull-provinces`, {
          method: 'GET',
          headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
          cache: 'no-store',
        });
        provRows = await db
          .select()
          .from(provinces)
          .where(and(eq(provinces.userId, userId), eq(provinces.active, true)));
      } catch (err) {
        console.error('scheduler/generate self-heal pull failed', err);
        // Proceed anyway — buildProvinceContext treats still-stale rows as
        // "not done today" rather than silently trusting old flags.
      }
    }

    const [prayerRow, sevenDaysAgo] = await Promise.all([
      db.select().from(prayerTimes).where(eq(prayerTimes.userId, userId)).limit(1),
      Promise.resolve(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    ]);

    const configuredPrayerTimes: PrayerTimesConfig = prayerRow[0]
      ? {
          fajr: prayerRow[0].fajr,
          dhuhr: prayerRow[0].dhuhr,
          asr: prayerRow[0].asr,
          maghrib: prayerRow[0].maghrib,
          isha: prayerRow[0].isha,
        }
      : DEFAULT_PRAYER_TIMES;

    const provinceContext = buildProvinceContext(provRows);
    const extractedTasks = extractPendingTaskHints(provinceContext, { isFriday, isFastDay });

    const recentNotes = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          gte(chatMessages.date, sevenDaysAgo),
          eq(chatMessages.feedsSchedule, true)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    const chatNotes = recentNotes
      .reverse()
      .map((m) => `[${m.date} ${m.role}] ${m.content}`)
      .join('\n');

    const prompt = buildSchedulerPrompt({
      date,
      dayName,
      isFriday,
      isFastDay,
      prayerTimes: configuredPrayerTimes,
      provinceContext,
      extractedTasks,
      chatNotes,
    });

    let tasks: ScheduledTask[] = [];
    let generationError: string | null = null;

    try {
      const apiKeys = await getUserGeminiKeys(userId);
      const raw = await callGemini(prompt, { apiKeys });
      tasks = parseJsonResponse<ScheduledTask[]>(raw);
      if (!Array.isArray(tasks)) throw new Error('Gemini did not return an array');
    } catch (err) {
      // Never let a Gemini failure crash the schedule — store the error
      // and an empty task list so the UI can show a clear "regenerate" state.
      generationError = err instanceof GeminiError ? `${err.message}: ${err.attempts.join(' | ')}` : String(err);
      tasks = [];
    }

    await db
      .insert(dailySchedule)
      .values({ userId, date, tasks, status: 'active', generationError })
      .onConflictDoUpdate({
        target: [dailySchedule.userId, dailySchedule.date],
        set: { tasks, generatedAt: new Date(), status: 'active', generationError },
      });

    return NextResponse.json({ date, taskCount: tasks.length, generationError });
  } catch (err) {
    console.error('scheduler/generate error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
