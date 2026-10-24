import { and, desc, eq, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { personalDailyLogs, personalWorkoutPlans } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { getPersonalGeminiKeys } from '@/lib/personal/api';
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
    return NextResponse.json({ error: 'No Gemini API keys configured in Kernel settings.' }, { status: 400 });
  }

  const today = todayISO();
  const weekStart = getMondayOfWeek(today);
  const weekDates = getTrainingDaysForWeek(weekStart);
  const lastWeekStart = getMondayOfWeek(
    new Date(new Date(`${weekStart}T00:00:00`).getTime() - 7 * 86400000).toLocaleDateString('en-CA')
  );
  const lastWeekLogs = await db
    .select({ effortRating: personalDailyLogs.effortRating, allSetsDone: personalDailyLogs.allSetsDone })
    .from(personalDailyLogs)
    .where(and(eq(personalDailyLogs.userId, userId), gte(personalDailyLogs.date, lastWeekStart)))
    .orderBy(desc(personalDailyLogs.date));

  const lastWeekEffort = lastWeekLogs.map((log) => log.effortRating ?? 0).filter(Boolean);
  const lastWeekSets = lastWeekLogs.map((log) => (log.allSetsDone ? 1 : 0));
  try {
    const plans = await generateWeeklyWorkouts(weekDates, lastWeekEffort, lastWeekSets, keys);
    for (const plan of plans) {
      await db
        .insert(personalWorkoutPlans)
        .values({
          userId,
          date: plan.date,
          day: plan.day,
          weekStart,
          plan: { focus: plan.focus, exercises: plan.exercises },
        })
        .onConflictDoUpdate({
          target: [personalWorkoutPlans.userId, personalWorkoutPlans.date],
          set: { plan: { focus: plan.focus, exercises: plan.exercises }, weekStart, day: plan.day },
        });
    }
    return NextResponse.json({ ok: true, generated: plans.length, weekStart });
  } catch (error) {
    console.error('Personal workout generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
