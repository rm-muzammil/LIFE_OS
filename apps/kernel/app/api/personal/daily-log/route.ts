import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { personalDailyLogs, type NewPersonalDailyLog } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { computeScore, isRestDay } from '@/lib/personal/scoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  const [log] = await db
    .select()
    .from(personalDailyLogs)
    .where(and(eq(personalDailyLogs.userId, userId), eq(personalDailyLogs.date, date)));
  return NextResponse.json(log ?? null);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const date = body.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'valid date required' }, { status: 400 });
  }

  const fields: Partial<NewPersonalDailyLog> = {};
  const booleanKeys = [
    'workoutDone',
    'allSetsDone',
    'meals',
    'socialMediaOk',
    'helpedSomeone',
    'contactedParents',
    'familyTies',
  ] as const;
  for (const key of booleanKeys) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') {
        return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
      }
      fields[key] = body[key];
    }
  }

  const numberKeys = [
    'effortRating',
    'calories',
    'protein',
    'sleepHours',
    'productiveHours',
    'charityAmount',
    'goodDeeds',
  ] as const;
  for (const key of numberKeys) {
    if (key in body) {
      if (typeof body[key] !== 'number' || !Number.isFinite(body[key])) {
        return NextResponse.json({ error: `${key} must be a finite number` }, { status: 400 });
      }
      fields[key] = body[key];
    }
  }

  const restDay = isRestDay(date);
  const [existing] = await db
    .select()
    .from(personalDailyLogs)
    .where(and(eq(personalDailyLogs.userId, userId), eq(personalDailyLogs.date, date)));
  const merged = {
    workoutDone: fields.workoutDone ?? existing?.workoutDone ?? false,
    allSetsDone: fields.allSetsDone ?? existing?.allSetsDone ?? false,
    effortRating: fields.effortRating ?? existing?.effortRating ?? 0,
    calories: fields.calories ?? existing?.calories ?? 0,
    protein: fields.protein ?? existing?.protein ?? 0,
    meals: fields.meals ?? existing?.meals ?? false,
    sleepHours: fields.sleepHours ?? existing?.sleepHours ?? 0,
    productiveHours: fields.productiveHours ?? existing?.productiveHours ?? 0,
    socialMediaOk: fields.socialMediaOk ?? existing?.socialMediaOk ?? false,
  };
  const score = computeScore({
    workoutDone: merged.workoutDone ?? false,
    allSetsDone: merged.allSetsDone ?? false,
    effortRating: merged.effortRating ?? 0,
    isRestDay: restDay,
    calories: merged.calories ?? 0,
    protein: merged.protein ?? 0,
    meals: merged.meals ?? false,
    sleepHours: merged.sleepHours ?? 0,
    productiveHours: merged.productiveHours ?? 0,
    socialMediaOk: merged.socialMediaOk ?? false,
  });

  if (existing) {
    await db
      .update(personalDailyLogs)
      .set({ ...fields, isRestDay: restDay, totalScore: score, updatedAt: new Date() })
      .where(and(eq(personalDailyLogs.userId, userId), eq(personalDailyLogs.date, date)));
  } else {
    await db
      .insert(personalDailyLogs)
      .values({
        userId,
        date,
        ...fields,
        isRestDay: restDay,
        totalScore: score,
      })
      .onConflictDoUpdate({
        target: [personalDailyLogs.userId, personalDailyLogs.date],
        set: { ...fields, isRestDay: restDay, totalScore: score, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true, score });
}
