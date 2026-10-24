import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { personalExerciseLogs } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { refreshPersonalProvinceScore } from '@/lib/personal/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const { date, exerciseName, setsPlanned, setsCompleted, reps, notes } = body;
  if (
    typeof date !== 'string' ||
    typeof exerciseName !== 'string' ||
    typeof setsPlanned !== 'number' ||
    typeof setsCompleted !== 'number' ||
    typeof reps !== 'string' ||
    typeof notes !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid exercise log fields' }, { status: 400 });
  }

  await db
    .insert(personalExerciseLogs)
    .values({ userId, date, exerciseName, setsPlanned, setsCompleted, reps, notes })
    .onConflictDoUpdate({
      target: [
        personalExerciseLogs.userId,
        personalExerciseLogs.date,
        personalExerciseLogs.exerciseName,
      ],
      set: { setsPlanned, setsCompleted, reps, notes },
    });

  await refreshPersonalProvinceScore(userId);
  return NextResponse.json({ ok: true });
}
