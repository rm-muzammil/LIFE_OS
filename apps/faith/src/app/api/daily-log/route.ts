import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLog, settings, vocabBank, rakuProgress } from "@/db/schema";
import { eq, count, desc, and } from "drizzle-orm";
import { computeScore } from "@/lib/scoring";
import { pushProvinceReport } from "@/lib/province";
import { TOTAL_JUZ30_VERSES } from "@/lib/quran";
import { requireUserId } from "@/lib/session";
import { waitUntil } from "@vercel/functions";

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); } catch (err) {
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw new Error("unreachable");
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const [row] = await db.select().from(dailyLog)
    .where(and(eq(dailyLog.userId, userId), eq(dailyLog.date, date)))
    .limit(1);
  return NextResponse.json(row ?? null);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const { date, ...fields } = body;
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  // Sync tafseer from raku tracker
  const todayRaku = await db.select().from(rakuProgress)
    .where(and(eq(rakuProgress.userId, userId), eq(rakuProgress.tafseerDone, true)))
    .orderBy(desc(rakuProgress.updatedAt))
    .limit(1);

  const rakuTafseerToday = todayRaku.length > 0 &&
    todayRaku[0].updatedAt.toISOString().slice(0, 10) === date;
  const tafseerDone = rakuTafseerToday ? true : (fields.tafseerDone ?? false);
  const tajweedFromRaku = rakuTafseerToday ? (todayRaku[0].tajweedConfidence ?? 0) : 0;
  const tajweedConfidence = Math.max(fields.tajweedConfidence ?? 0, tajweedFromRaku);

  const { finalScore, rawScore } = computeScore({ ...fields, tafseerDone, tajweedConfidence, date });

  const payload = {
    userId,
    date,
    fajr:               fields.fajr ?? false,
    dhuhr:              fields.dhuhr ?? false,
    asr:                fields.asr ?? false,
    maghrib:            fields.maghrib ?? false,
    isha:               fields.isha ?? false,
    onTime:             fields.onTime ?? 0,
    morningAdhkar:      fields.morningAdhkar ?? false,
    eveningAdhkar:      fields.eveningAdhkar ?? false,
    beforeSleepAdhkar:  fields.beforeSleepAdhkar ?? false,
    dhikrMinutes:       fields.dhikrMinutes ?? 0,
    duaMinutes:         fields.duaMinutes ?? 0,
    laIlaha:            fields.laIlaha ?? false,
    subhanallahi:       fields.subhanallahi ?? false,
    quranPages:         fields.quranPages ?? 0,
    tadabburMinutes:    fields.tadabburMinutes ?? 0,
    tafseerDone,
    tajweedConfidence,
    verseDone:          fields.verseDone ?? false,
    islamicStudyMinutes: fields.islamicStudyMinutes ?? 0,
    surahMulk:          fields.surahMulk ?? false,
    surahKahf:          fields.surahKahf ?? false,
    gazeLowered:        fields.gazeLowered ?? 0,
    haramFree:          fields.haramFree ?? false,
    finalScore,
    rawScore,
    updatedAt: new Date(),
  };

  const saved = await withRetry(() =>
    db.insert(dailyLog)
      .values(payload)
      .onConflictDoUpdate({ target: [dailyLog.userId, dailyLog.date], set: payload })
      .returning()
      .then((r) => r[0])
  );

  // Auto-advance verse
  if (fields.verseDone) {
    const allSettings = await db.select().from(settings)
      .where(eq(settings.userId, userId));
    const settingMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
    const currentIndex = parseInt(settingMap["current_verse_index"] ?? "0", 10);
    if (settingMap["verse_last_advanced"] !== date) {
      const nextIndex = (currentIndex + 1) % TOTAL_JUZ30_VERSES;
      for (const [key, value] of [["current_verse_index", String(nextIndex)], ["verse_last_advanced", date]] as const) {
        await db.insert(settings).values({ userId, key, value })
          .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value, updatedAt: new Date() } });
      }
    }
  }

  // Streak
  const allLogs = await db.select({ date: dailyLog.date }).from(dailyLog)
    .where(eq(dailyLog.userId, userId)).orderBy(dailyLog.date);
  const sortedDates = allLogs.map((r) => r.date).sort().reverse();
  let streak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(date);
    expected.setDate(expected.getDate() - i);
    if (sortedDates[i] === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }

  // Province push
  const [{ count: rakuCount }] = await db.select({ count: count() }).from(rakuProgress)
    .where(and(eq(rakuProgress.userId, userId), eq(rakuProgress.tafseerDone, true)));
  const [{ count: vocabCount }] = await db.select({ count: count() }).from(vocabBank)
    .where(eq(vocabBank.userId, userId));

  waitUntil(
    pushProvinceReport(saved, streak, rakuCount as number, vocabCount as number, userId)
  );

  return NextResponse.json({ ok: true, score: finalScore, streak, row: saved });
}