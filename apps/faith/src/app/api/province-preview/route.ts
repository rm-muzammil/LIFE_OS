// src/app/api/province-preview/route.ts
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import { dailyLog, settings, vocabBank } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";



export async function GET() {
    const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  const sql = neon(databaseUrl);
  const today = new Date().toISOString().slice(0, 10);

  // Today's log
  const [log] = await db
    .select()
    .from(dailyLog)
    .where(eq(dailyLog.date, today))
    .limit(1);

  // Streak
  const allLogs = await db
    .select({ date: dailyLog.date })
    .from(dailyLog)
    .orderBy(desc(dailyLog.date));

  let streak = 0;
  for (let i = 0; i < allLogs.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (allLogs[i].date === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }

  // Raku count (completed)
  const rakuRows = await sql`SELECT count(*) FROM raku_progress WHERE tafseer_done = true AND tajweed_confidence > 0 AND vocab_extracted = true`;
  const rakuNum = parseInt(rakuRows[0].count as string, 10);

  // Current raku number
  const allRaku = await sql`SELECT raku_number FROM raku_progress WHERE tafseer_done = true AND tajweed_confidence > 0 AND vocab_extracted = true ORDER BY raku_number ASC`;
  let currentRaku = 1;
  const completedSet = new Set((allRaku as any[]).map((r: any) => r.raku_number as number));
  for (let i = 1; i <= 558; i++) {
    if (!completedSet.has(i)) { currentRaku = i; break; }
  }

  // Vocab count
  const [{ count: vocabCount }] = await db.select({ count: count() }).from(vocabBank);

  // Settings
  const allSettings = await db.select().from(settings);
  const settingMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));

  const payload = log ? {
    score: log.finalScore,
    label: "Faith",
    streak,
    todayDone: true,
    updatedAt: new Date().toISOString(),
    details: {
      salah: [log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha].filter(Boolean).length,
      onTime: log.onTime,
      quranPages: log.quranPages,
      adhkar: log.morningAdhkar && log.eveningAdhkar,
      dhikrDone: log.dhikrMinutes >= 5,
      laIlaha: log.laIlaha,
      subhanallahi: log.subhanallahi,
      tafseerDone: log.tafseerDone,
      verseDone: log.verseDone,
      surahMulk: log.surahMulk,
      surahKahf: log.surahKahf,
      islamicStudy: log.islamicStudyMinutes,
      gazeLowered: log.gazeLowered,
      haramFree: log.haramFree,
      rakuNum: currentRaku - 1,
      vocabCount: vocabCount as number,
    },
  } : {
    score: 0,
    label: "Faith",
    streak: 0,
    todayDone: false,
    updatedAt: new Date().toISOString(),
    details: {},
  };

  return NextResponse.json({
    endpoint: `${settingMap["sk_url"] ?? "https://self-khilafah.vercel.app"}/api/provinces/report`,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": settingMap["api_key"] ? "***" + settingMap["api_key"].slice(-4) : "(not set)",
    },
    payload,
    meta: {
      todayLogExists: !!log,
      streak,
      rakuCompleted: rakuNum,
      vocabWords: vocabCount as number,
    },
  });
}