import { NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, characterRatings, weeklyReview } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { computeLifeScore } from '@/lib/life-score';
import { isoWeekPKT } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeProvinces = await db.select().from(provinces).where(eq(provinces.active, true));

    const currentWeek = isoWeekPKT();
    const [character] = await db
      .select()
      .from(characterRatings)
      .where(eq(characterRatings.isoWeek, currentWeek));
    const [review] = await db
      .select()
      .from(weeklyReview)
      .where(eq(weeklyReview.isoWeek, currentWeek));

    const result = computeLifeScore(activeProvinces, character, review);

    return NextResponse.json({ ...result, isoWeek: currentWeek });
  } catch (err) {
    console.error('life-score GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
