import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { characterRatings } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { isoWeekPKT } from '@/lib/time';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db
      .select()
      .from(characterRatings)
      .where(eq(characterRatings.userId, userId))
      .orderBy(desc(characterRatings.isoWeek));
    return NextResponse.json({ weeks: rows }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });
  } catch (err) {
    console.error('character GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patience, discipline, gratitude, humility, truthfulness, isoWeek } = body as {
      patience: number;
      discipline: number;
      gratitude: number;
      humility: number;
      truthfulness: number;
      isoWeek?: string;
    };

    const values = [patience, discipline, gratitude, humility, truthfulness];
    if (values.some((v) => typeof v !== 'number' || v < 1 || v > 5)) {
      return NextResponse.json({ error: 'All virtues must be a number 1-5' }, { status: 400 });
    }

    const week = isoWeek || isoWeekPKT();

    const [existing] = await db
      .select()
      .from(characterRatings)
      .where(and(eq(characterRatings.userId, userId), eq(characterRatings.isoWeek, week)));

    let result;
    if (existing) {
      [result] = await db
        .update(characterRatings)
        .set({ patience, discipline, gratitude, humility, truthfulness, updatedAt: new Date() })
        .where(and(eq(characterRatings.userId, userId), eq(characterRatings.isoWeek, week)))
        .returning();
    } else {
      [result] = await db
        .insert(characterRatings)
        .values({ userId, isoWeek: week, patience, discipline, gratitude, humility, truthfulness })
        .returning();
    }

    return NextResponse.json({ week: result });
  } catch (err) {
    console.error('character POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
