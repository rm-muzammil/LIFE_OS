import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import { dailyLog, settings, vocabBank } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  // Auth via Bearer token
  const pullSecret = process.env.PULL_SECRET;
  const auth = req.headers.get("authorization");
  if (pullSecret && auth !== `Bearer ${pullSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "X-User-Id required" }, { status: 400 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

  const [log] = await db.select().from(dailyLog)
    .where(and(eq(dailyLog.userId, userId), eq(dailyLog.date, today))).limit(1);

  // Streak
  const allLogs = await db.select({ date: dailyLog.date }).from(dailyLog)
    .where(eq(dailyLog.userId, userId)).orderBy(desc(dailyLog.date));
  let streak = 0;
  for (let i = 0; i < allLogs.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (allLogs[i].date === expected.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" })) streak++;
    else break;
  }

  // Raku + vocab
  const rakuRows = await sql`SELECT count(*) FROM raku_progress WHERE user_id = ${userId} AND tafseer_done = true AND tajweed_confidence > 0 AND vocab_extracted = true`;
  const [{ count: vocabCount }] = await db.select({ count: count() }).from(vocabBank)
    .where(eq(vocabBank.userId, userId));

  if (!log) {
    return NextResponse.json({ score: 0, label: "Faith", streak: 0, todayDone: false, updatedAt: new Date().toISOString(), details: {} });
  }

  return NextResponse.json({
    score:     log.finalScore,
    label:     "Faith",
    streak,
    todayDone: true,
    updatedAt: log.updatedAt.toISOString(),
    details: {
      salah:        [log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha].filter(Boolean).length,
      onTime:       log.onTime,
      quranPages:   log.quranPages,
      adhkar:       log.morningAdhkar && log.eveningAdhkar,
      laIlaha:      log.laIlaha,
      subhanallahi: log.subhanallahi,
      tafseerDone:  log.tafseerDone,
      verseDone:    log.verseDone,
      surahMulk:    log.surahMulk,
      surahKahf:    log.surahKahf,
      islamicStudy: log.islamicStudyMinutes,
      gazeLowered:  log.gazeLowered,
      haramFree:    log.haramFree,
      rakuNum:      parseInt(rakuRows[0].count as string, 10),
      vocabCount:   vocabCount as number,
    },
  });
}