import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import { dailyLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeScore } from "@/lib/scoring";
import { requireUserId } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
  const rows = await sql`SELECT * FROM dhikr_counts WHERE user_id = ${userId} AND date = ${date}`;
  return NextResponse.json((rows as any[]).map((r) => ({
    id: r.id, date: r.date, dhikrKey: r.dhikr_key,
    count: r.count, target: r.target, completed: r.completed,
  })));
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { date, dhikrKey, count, target } = await req.json();
  if (!date || !dhikrKey) return NextResponse.json({ error: "date and dhikrKey required" }, { status: 400 });

  const completed = count >= target;

  await sql`
    INSERT INTO dhikr_counts (user_id, date, dhikr_key, count, target, completed, updated_at)
    VALUES (${userId}, ${date}, ${dhikrKey}, ${count}, ${target}, ${completed}, NOW())
    ON CONFLICT (user_id, date, dhikr_key)
    DO UPDATE SET count = ${count}, completed = ${completed}, updated_at = NOW()
  `;

  const [existing] = await db.select().from(dailyLog)
    .where(and(eq(dailyLog.userId, userId), eq(dailyLog.date, date))).limit(1);

  const base = existing ?? {
    userId, date, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
    onTime: 0, morningAdhkar: false, eveningAdhkar: false, beforeSleepAdhkar: false,
    dhikrMinutes: 0, duaMinutes: 0, laIlaha: false, subhanallahi: false,
    quranPages: 0, tadabburMinutes: 0, tafseerDone: false, tajweedConfidence: 0,
    verseDone: false, islamicStudyMinutes: 0, surahMulk: false, surahKahf: false,
    gazeLowered: 0, haramFree: false, finalScore: 0, rawScore: 0,
  };

  const updates: Record<string, boolean> = {};
  if (completed && dhikrKey === "la_ilaha")    updates.laIlaha = true;
  if (completed && dhikrKey === "subhanallah") updates.subhanallahi = true;

  if (dhikrKey.startsWith("morning_")) {
    const rows = await sql`SELECT dhikr_key, completed FROM dhikr_counts WHERE user_id = ${userId} AND date = ${date} AND dhikr_key LIKE 'morning_%'`;
    const doneSet = new Set((rows as any[]).filter((r) => r.completed).map((r) => r.dhikr_key as string));
    if (completed) doneSet.add(dhikrKey);
    if (Array.from({ length: 12 }, (_, i) => `morning_${i + 1}`).every((k) => doneSet.has(k))) {
      updates.morningAdhkar = true;
    }
  }

  if (dhikrKey.startsWith("evening_")) {
    const rows = await sql`SELECT dhikr_key, completed FROM dhikr_counts WHERE user_id = ${userId} AND date = ${date} AND dhikr_key LIKE 'evening_%'`;
    const doneSet = new Set((rows as any[]).filter((r) => r.completed).map((r) => r.dhikr_key as string));
    if (completed) doneSet.add(dhikrKey);
    if (Array.from({ length: 12 }, (_, i) => `evening_${i + 1}`).every((k) => doneSet.has(k))) {
      updates.eveningAdhkar = true;
    }
  }

  if (dhikrKey.startsWith("sleep_") && completed) {
    const rows = await sql`SELECT dhikr_key, completed FROM dhikr_counts WHERE user_id = ${userId} AND date = ${date} AND dhikr_key LIKE 'sleep_%'`;
    const doneSet = new Set((rows as any[]).filter((r) => r.completed).map((r) => r.dhikr_key as string));
    doneSet.add(dhikrKey);
    if (Array.from({ length: 10 }, (_, i) => `sleep_${i + 1}`).every((k) => doneSet.has(k))) {
      updates.beforeSleepAdhkar = true;
    }
  }

  if (Object.keys(updates).length > 0) {
    const merged = { ...base, ...updates };
    const { finalScore, rawScore } = computeScore({ ...merged, date });
    await db.insert(dailyLog).values({ ...merged, finalScore, rawScore, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [dailyLog.userId, dailyLog.date],
        set: { ...updates, finalScore, rawScore, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true, count, completed });
}