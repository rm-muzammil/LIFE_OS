import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faithDhikrCounts } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { isDateString } from '@/lib/faith/date';
import { syncDailyLogFromDhikr } from '@/lib/faith/dhikr';
import { isFiniteInteger, isRecord } from '@/lib/faith/validation';
import { refreshFaithProvinceScore } from '@/lib/faith/refresh';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  if (!isDateString(date)) {
    return NextResponse.json({ error: 'date must use YYYY-MM-DD format' }, { status: 400 });
  }

  const rows = await db
    .select({
      id: faithDhikrCounts.id,
      date: faithDhikrCounts.date,
      dhikrKey: faithDhikrCounts.dhikrKey,
      count: faithDhikrCounts.count,
      target: faithDhikrCounts.target,
      completed: faithDhikrCounts.completed,
    })
    .from(faithDhikrCounts)
    .where(and(eq(faithDhikrCounts.userId, userId), eq(faithDhikrCounts.date, date)));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  if (!isDateString(body.date)) {
    return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 });
  }
  if (typeof body.dhikrKey !== 'string' || body.dhikrKey.length === 0) {
    return NextResponse.json({ error: 'dhikrKey is required' }, { status: 400 });
  }
  if (!isFiniteInteger(body.count) || body.count < 0) {
    return NextResponse.json({ error: 'count must be a non-negative integer' }, { status: 400 });
  }
  if (!isFiniteInteger(body.target) || body.target < 0) {
    return NextResponse.json({ error: 'target must be a non-negative integer' }, { status: 400 });
  }

  const completed = body.count >= body.target;
  await db
    .insert(faithDhikrCounts)
    .values({
      userId,
      date: body.date,
      dhikrKey: body.dhikrKey,
      count: body.count,
      target: body.target,
      completed,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [faithDhikrCounts.userId, faithDhikrCounts.date, faithDhikrCounts.dhikrKey],
      set: { count: body.count, completed, updatedAt: new Date() },
    });

  await syncDailyLogFromDhikr(userId, body.date, body.dhikrKey, completed);
  await refreshFaithProvinceScore(userId);
  return NextResponse.json({ ok: true, count: body.count, completed });
}
