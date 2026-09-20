import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import { dailyLog, rakuProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeScore } from "@/lib/scoring";
import { requireUserId } from "@/lib/session";

const sql = neon(process.env.DATABASE_URL!);

function mapRaku(r: Record<string, unknown>) {
  return {
    id:                r.id as number,
    userId:            r.user_id as string,
    rakuNumber:        r.raku_number as number,
    tafseerDone:       r.tafseer_done as boolean,
    tajweedConfidence: r.tajweed_confidence as number,
    vocabExtracted:    r.vocab_extracted as boolean,
    completedAt:       r.completed_at ? new Date(r.completed_at as string) : null,
    notes:             r.notes as string | null,
    createdAt:         new Date(r.created_at as string),
    updatedAt:         new Date(r.updated_at as string),
  };
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const rows = await sql`SELECT * FROM raku_progress WHERE user_id = ${userId} ORDER BY raku_number ASC`;
  return NextResponse.json((rows as Record<string, unknown>[]).map(mapRaku));
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const { rakuNumber, tafseerDone, tajweedConfidence, vocabExtracted, notes } = body;
  if (!rakuNumber) return NextResponse.json({ error: "rakuNumber required" }, { status: 400 });

  const [existing] = await sql`
    SELECT * FROM raku_progress WHERE user_id = ${userId} AND raku_number = ${rakuNumber} LIMIT 1
  `;

  const mergedTafseer = !!(existing?.tafseer_done || tafseerDone);
  const mergedTajweed = Math.max((existing?.tajweed_confidence as number) ?? 0, tajweedConfidence ?? 0);
  const mergedVocab   = !!(existing?.vocab_extracted || vocabExtracted);
  const mergedNotes   = notes ?? existing?.notes ?? null;
  const allDone       = mergedTafseer && mergedTajweed > 0 && mergedVocab;
  const completedAt   = existing?.completed_at ? existing.completed_at : allDone ? new Date().toISOString() : null;

  let saved: Record<string, unknown>;
  if (existing) {
    const [updated] = await sql`
      UPDATE raku_progress SET
        tafseer_done = ${mergedTafseer}, tajweed_confidence = ${mergedTajweed},
        vocab_extracted = ${mergedVocab}, notes = ${mergedNotes},
        completed_at = ${completedAt}, updated_at = NOW()
      WHERE user_id = ${userId} AND raku_number = ${rakuNumber} RETURNING *
    `;
    saved = updated;
  } else {
    const [inserted] = await sql`
      INSERT INTO raku_progress (user_id, raku_number, tafseer_done, tajweed_confidence, vocab_extracted, notes, completed_at, updated_at)
      VALUES (${userId}, ${rakuNumber}, ${mergedTafseer}, ${mergedTajweed}, ${mergedVocab}, ${mergedNotes}, ${completedAt}, NOW())
      RETURNING *
    `;
    saved = inserted;
  }

  // Sync to daily_log
  if (mergedTafseer) {
    const today = new Date().toISOString().slice(0, 10);
    const [todayLog] = await db.select().from(dailyLog)
      .where(and(eq(dailyLog.userId, userId), eq(dailyLog.date, today))).limit(1);
    const base = todayLog ?? {
      userId, date: today, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
      onTime: 0, morningAdhkar: false, eveningAdhkar: false, beforeSleepAdhkar: false,
      dhikrMinutes: 0, duaMinutes: 0, laIlaha: false, subhanallahi: false,
      quranPages: 0, tadabburMinutes: 0, tafseerDone: false, tajweedConfidence: 0,
      verseDone: false, islamicStudyMinutes: 0, surahMulk: false, surahKahf: false,
      gazeLowered: 0, haramFree: false, finalScore: 0, rawScore: 0,
    };
    const merged = { ...base, tafseerDone: true, tajweedConfidence: Math.max(base.tajweedConfidence ?? 0, mergedTajweed), updatedAt: new Date() };
    const { finalScore, rawScore } = computeScore({ ...merged, date: today });
    await db.insert(dailyLog).values({ ...merged, finalScore, rawScore })
      .onConflictDoUpdate({
        target: [dailyLog.userId, dailyLog.date],
        set: { tafseerDone: true, tajweedConfidence: merged.tajweedConfidence, finalScore, rawScore, updatedAt: new Date() },
      });
  }

  return NextResponse.json(mapRaku(saved));
}