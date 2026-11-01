import { and, asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faithRakuProgress } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import {
  defaultDailyLog,
  getDailyLog,
  saveDailyLog,
} from '@/lib/faith/daily-log';
import { isFiniteInteger, isRecord } from '@/lib/faith/validation';
import { refreshFaithProvinceScore } from '@/lib/faith/refresh';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(faithRakuProgress)
    .where(eq(faithRakuProgress.userId, userId))
    .orderBy(asc(faithRakuProgress.rakuNumber));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  if (!isFiniteInteger(body.rakuNumber) || body.rakuNumber < 1) {
    return NextResponse.json({ error: 'rakuNumber must be a positive integer' }, { status: 400 });
  }
  for (const key of ['tafseerDone', 'vocabExtracted'] as const) {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
  }
  if (
    body.tajweedConfidence !== undefined &&
    (!isFiniteInteger(body.tajweedConfidence) ||
      body.tajweedConfidence < 0 ||
      body.tajweedConfidence > 5)
  ) {
    return NextResponse.json(
      { error: 'tajweedConfidence must be an integer from 0 to 5' },
      { status: 400 }
    );
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(faithRakuProgress)
    .where(
      and(
        eq(faithRakuProgress.userId, userId),
        eq(faithRakuProgress.rakuNumber, body.rakuNumber)
      )
    )
    .limit(1);
  const tafseerDone = Boolean(existing?.tafseerDone || body.tafseerDone === true);
  const vocabExtracted = Boolean(existing?.vocabExtracted || body.vocabExtracted === true);
  const tajweedConfidence = Math.max(
    existing?.tajweedConfidence ?? 0,
    isFiniteInteger(body.tajweedConfidence) ? body.tajweedConfidence : 0
  );
  const completedAt =
    existing?.completedAt ??
    (tafseerDone && tajweedConfidence > 0 && vocabExtracted ? new Date() : null);
  const notes =
    typeof body.notes === 'string' ? body.notes : existing?.notes ?? null;
  const updatedAt = new Date();

  const [row] = await db
    .insert(faithRakuProgress)
    .values({
      userId,
      rakuNumber: body.rakuNumber,
      tafseerDone,
      tajweedConfidence,
      vocabExtracted,
      completedAt,
      notes,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [faithRakuProgress.userId, faithRakuProgress.rakuNumber],
      set: {
        tafseerDone,
        tajweedConfidence,
        vocabExtracted,
        completedAt,
        notes,
        updatedAt,
      },
    })
    .returning();

  if (tafseerDone) {
    const date = new Date().toISOString().slice(0, 10);
    const existingLog = await getDailyLog(userId, date);
    const input = existingLog ? {
      date: existingLog.date,
      fajr: existingLog.fajr,
      dhuhr: existingLog.dhuhr,
      asr: existingLog.asr,
      maghrib: existingLog.maghrib,
      isha: existingLog.isha,
      onTime: existingLog.onTime,
      morningAdhkar: existingLog.morningAdhkar,
      eveningAdhkar: existingLog.eveningAdhkar,
      beforeSleepAdhkar: existingLog.beforeSleepAdhkar,
      dhikrMinutes: existingLog.dhikrMinutes,
      duaMinutes: existingLog.duaMinutes,
      laIlaha: existingLog.laIlaha,
      subhanallahi: existingLog.subhanallahi,
      quranPages: existingLog.quranPages,
      tadabburMinutes: existingLog.tadabburMinutes,
      tafseerDone: existingLog.tafseerDone,
      tajweedConfidence: existingLog.tajweedConfidence,
      verseDone: existingLog.verseDone,
      islamicStudyMinutes: existingLog.islamicStudyMinutes,
      surahMulk: existingLog.surahMulk,
      surahKahf: existingLog.surahKahf,
      gazeLowered: existingLog.gazeLowered,
      haramFree: existingLog.haramFree,
    } : defaultDailyLog(date);
    input.tafseerDone = true;
    input.tajweedConfidence = Math.max(input.tajweedConfidence ?? 0, tajweedConfidence);
    await saveDailyLog(userId, input);
  }

  await refreshFaithProvinceScore(userId);
  return NextResponse.json(row);
}
