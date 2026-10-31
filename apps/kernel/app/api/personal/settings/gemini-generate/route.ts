import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { personalDailyLogs, personalWorkoutPlans } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import {
  getPersonalGeminiKeys,
  refreshPersonalProvinceScore,
} from '@/lib/personal/api';
import {
  generateWeeklyWorkouts,
  getMondayOfWeek,
  getTrainingDaysForWeek,
} from '@/lib/personal/gemini';
import { todayISO } from '@/lib/personal/scoring';

export const dynamic = 'force-dynamic';

export async function POST() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await getPersonalGeminiKeys(userId);
  if (keys.length === 0) {
    return NextResponse.json({ error: 'Gemini API key not set in Kernel settings' }, { status: 400 });
  }

  try {
    const today = todayISO();
    const monday = getMondayOfWeek(today);
    const weekDates = getTrainingDaysForWeek(monday);
    const recentLogs = await db
      .select()
      .from(personalDailyLogs)
      .where(eq(personalDailyLogs.userId, userId))
      .orderBy(desc(personalDailyLogs.date))
      .limit(14);
    const trainingLogs = recentLogs.filter(
      (log) => !log.isRestDay && log.effortRating && log.effortRating > 0
    );
    const lastWeekEffort = trainingLogs.slice(0, 5).map((log) => log.effortRating ?? 3);
    const lastWeekSets = trainingLogs.slice(0, 5).map((log) => (log.allSetsDone ? 1 : 0));
    const plans = await generateWeeklyWorkouts(weekDates, lastWeekEffort, lastWeekSets, keys);

    for (const plan of plans) {
      await db
        .insert(personalWorkoutPlans)
        .values({
          userId,
          weekStart: monday,
          day: plan.day,
          date: plan.date,
          plan: { exercises: plan.exercises, focus: plan.focus },
        })
        .onConflictDoUpdate({
          target: [personalWorkoutPlans.userId, personalWorkoutPlans.date],
          set: { weekStart: monday, day: plan.day, plan: { exercises: plan.exercises, focus: plan.focus } },
        });
    }
    await refreshPersonalProvinceScore(userId);
    return NextResponse.json({ ok: true, plans });
  } catch (error) {
    console.error('Personal Gemini generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
