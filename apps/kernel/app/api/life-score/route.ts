import { NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, characterRatings, weeklyReview } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { computeLifeScore } from '@/lib/life-score';
import { isoWeekPKT } from '@/lib/time';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeProvinces = await db
      .select()
      .from(provinces)
      .where(and(eq(provinces.userId, userId), eq(provinces.active, true)));

    const currentWeek = isoWeekPKT();
    const [character] = await db
      .select()
      .from(characterRatings)
      .where(and(eq(characterRatings.userId, userId), eq(characterRatings.isoWeek, currentWeek)));
    const [review] = await db
      .select()
      .from(weeklyReview)
      .where(and(eq(weeklyReview.userId, userId), eq(weeklyReview.isoWeek, currentWeek)));

    const result = computeLifeScore(activeProvinces, character, review);

    return NextResponse.json({ ...result, isoWeek: currentWeek }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });
  } catch (err) {
    console.error('life-score GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
