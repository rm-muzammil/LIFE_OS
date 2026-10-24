import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { personalDailyLogs } from '@/db/schema';
import { todayISO } from '@/lib/personal/scoring';
import type { PersonalReport } from '@/lib/personal/types';

export async function computePersonalScore(userId: string): Promise<PersonalReport> {
  const logs = await db
    .select()
    .from(personalDailyLogs)
    .where(eq(personalDailyLogs.userId, userId))
    .orderBy(desc(personalDailyLogs.date))
    .limit(60);
  const today = todayISO();
  const log = logs.find((entry) => entry.date === today);

  let streak = 0;
  for (const entry of logs) {
    if ((entry.totalScore ?? 0) > 0) streak++;
    else break;
  }

  return {
    score: log?.totalScore ?? 0,
    label: 'Personal',
    streak,
    todayDone: (log?.totalScore ?? 0) > 0,
    updatedAt: new Date().toISOString(),
    details: {
      workoutDone: log?.workoutDone ?? false,
      allSetsDone: log?.allSetsDone ?? false,
      effort: log?.effortRating ?? 0,
      calories: log?.calories ?? 0,
      protein: log?.protein ?? 0,
      meals: log?.meals ?? false,
      sleep: log?.sleepHours ?? 0,
      productiveHours: log?.productiveHours ?? 0,
      socialMediaOk: log?.socialMediaOk ?? false,
    },
  };
}
