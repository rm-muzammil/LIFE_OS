import { and, desc, eq, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  faithDailyLogs,
  faithRakuProgress,
  type FaithDailyLog,
  type NewFaithDailyLog,
} from '@/db/schema';
import { computeFaithDailyScore } from '@/lib/faith/scoring';
import { addDays, todayPKT } from '@/lib/faith/date';

export type FaithDailyLogInput = Omit<
  NewFaithDailyLog,
  'id' | 'userId' | 'finalScore' | 'rawScore' | 'createdAt' | 'updatedAt'
>;

export async function getDailyLog(userId: string, date: string): Promise<FaithDailyLog | null> {
  const [row] = await db
    .select()
    .from(faithDailyLogs)
    .where(and(eq(faithDailyLogs.userId, userId), eq(faithDailyLogs.date, date)))
    .limit(1);
  return row ?? null;
}

export async function getRecentDailyLogs(userId: string, limit = 90): Promise<FaithDailyLog[]> {
  return db
    .select()
    .from(faithDailyLogs)
    .where(eq(faithDailyLogs.userId, userId))
    .orderBy(desc(faithDailyLogs.date))
    .limit(limit);
}

export async function saveDailyLog(
  userId: string,
  input: FaithDailyLogInput
): Promise<FaithDailyLog> {
  const scores = computeFaithDailyScore(input);
  const values = {
    ...input,
    userId,
    finalScore: scores.finalScore,
    rawScore: scores.rawScore,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(faithDailyLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [faithDailyLogs.userId, faithDailyLogs.date],
      set: {
        ...input,
        finalScore: scores.finalScore,
        rawScore: scores.rawScore,
        updatedAt: values.updatedAt,
      },
    })
    .returning();
  return row;
}

export async function computeFaithStreak(userId: string, anchorDate = todayPKT()): Promise<number> {
  const rows = await db
    .select({ date: faithDailyLogs.date })
    .from(faithDailyLogs)
    .where(
      and(
        eq(faithDailyLogs.userId, userId),
        lte(faithDailyLogs.date, anchorDate)
      )
    )
    .orderBy(desc(faithDailyLogs.date));
  const completedDates = new Set(rows.map((row) => row.date));
  let streak = 0;
  let cursor = anchorDate;
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function getLatestRakuCompletedOn(
  userId: string,
  date: string
): Promise<{ tafseerDone: boolean; tajweedConfidence: number } | null> {
  const rows = await db
    .select({
      tafseerDone: faithRakuProgress.tafseerDone,
      tajweedConfidence: faithRakuProgress.tajweedConfidence,
      updatedAt: faithRakuProgress.updatedAt,
    })
    .from(faithRakuProgress)
    .where(and(eq(faithRakuProgress.userId, userId), eq(faithRakuProgress.tafseerDone, true)))
    .orderBy(desc(faithRakuProgress.updatedAt))
    .limit(1);
  const latest = rows[0];
  if (!latest || latest.updatedAt.toISOString().slice(0, 10) !== date) {
    return null;
  }
  return {
    tafseerDone: latest.tafseerDone,
    tajweedConfidence: latest.tajweedConfidence,
  };
}

export function defaultDailyLog(date: string): FaithDailyLogInput {
  return {
    date,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
    onTime: 0,
    morningAdhkar: false,
    eveningAdhkar: false,
    beforeSleepAdhkar: false,
    dhikrMinutes: 0,
    duaMinutes: 0,
    laIlaha: false,
    subhanallahi: false,
    quranPages: 0,
    tadabburMinutes: 0,
    tafseerDone: false,
    tajweedConfidence: 0,
    verseDone: false,
    islamicStudyMinutes: 0,
    surahMulk: false,
    surahKahf: false,
    gazeLowered: 0,
    haramFree: false,
  };
}
