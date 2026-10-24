import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { personalExerciseLogs, personalWorkoutPlans } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  const [plan] = await db
    .select()
    .from(personalWorkoutPlans)
    .where(and(eq(personalWorkoutPlans.userId, userId), eq(personalWorkoutPlans.date, date)));
  if (!plan) return NextResponse.json(null);

  const logs = await db
    .select()
    .from(personalExerciseLogs)
    .where(and(eq(personalExerciseLogs.userId, userId), eq(personalExerciseLogs.date, date)));
  return NextResponse.json({ plan, logs });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const { weekStart, day, date, plan } = body;
  if (
    typeof weekStart !== 'string' ||
    typeof day !== 'string' ||
    typeof date !== 'string' ||
    !plan ||
    typeof plan !== 'object'
  ) {
    return NextResponse.json({ error: 'weekStart, day, date, and plan are required' }, { status: 400 });
  }

  await db
    .insert(personalWorkoutPlans)
    .values({ userId, weekStart, day, date, plan })
    .onConflictDoUpdate({
      target: [personalWorkoutPlans.userId, personalWorkoutPlans.date],
      set: { weekStart, day, plan },
    });

  return NextResponse.json({ ok: true });
}
