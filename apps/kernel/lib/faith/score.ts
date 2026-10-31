import { and, count, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import {
  faithDailyLogs,
  faithRakuProgress,
  faithVocabBank,
} from '@/db/schema';
import { computeFaithStreak } from '@/lib/faith/daily-log';
import { todayPKT } from '@/lib/faith/date';
import type { ProvinceReportPayload } from '@/lib/types';

export async function computeFaithScore(
  userId: string
): Promise<Omit<ProvinceReportPayload, 'userId'>> {
  const date = todayPKT();
  const [log] = await db
    .select()
    .from(faithDailyLogs)
    .where(and(eq(faithDailyLogs.userId, userId), eq(faithDailyLogs.date, date)))
    .limit(1);

  if (!log) {
    return {
      score: 0,
      label: 'Faith',
      streak: 0,
      todayDone: false,
      updatedAt: new Date().toISOString(),
      details: {},
    };
  }

  const [[rakuResult], [vocabResult]] = await Promise.all([
    db
      .select({ value: count() })
      .from(faithRakuProgress)
      .where(
        and(
          eq(faithRakuProgress.userId, userId),
          eq(faithRakuProgress.tafseerDone, true),
          eq(faithRakuProgress.vocabExtracted, true),
          gt(faithRakuProgress.tajweedConfidence, 0)
        )
      ),
    db
      .select({ value: count() })
      .from(faithVocabBank)
      .where(eq(faithVocabBank.userId, userId)),
  ]);
  const details = {
    salah: [log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha].filter(Boolean).length,
    onTime: log.onTime,
    quranPages: log.quranPages,
    adhkar: log.morningAdhkar && log.eveningAdhkar,
    laIlaha: log.laIlaha,
    subhanallahi: log.subhanallahi,
    tafseerDone: log.tafseerDone,
    verseDone: log.verseDone,
    surahMulk: log.surahMulk,
    surahKahf: log.surahKahf,
    islamicStudy: log.islamicStudyMinutes,
    gazeLowered: log.gazeLowered,
    haramFree: log.haramFree,
    rakuNum: rakuResult.value,
    vocabCount: vocabResult.value,
    mulkDone: log.surahMulk,
    dhikrDone: log.laIlaha && log.subhanallahi,
    islamicStudyMinutes: log.islamicStudyMinutes,
  };
  return {
    score: log.finalScore,
    label: 'Faith',
    streak: await computeFaithStreak(userId, date),
    todayDone: true,
    updatedAt: log.updatedAt.toISOString(),
    details,
  };
}
