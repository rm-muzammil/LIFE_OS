import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weeklyReview } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { isoWeekPKT } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(weeklyReview).orderBy(desc(weeklyReview.isoWeek));
    return NextResponse.json({ weeks: rows });
  } catch (err) {
    console.error('review GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      wentWell,
      wentWrong,
      distractions,
      mustImprove,
      intentions,
      missionAlignScore,
      missionAlignNote,
      isoWeek,
    } = body as {
      wentWell?: string;
      wentWrong?: string;
      distractions?: string;
      mustImprove?: string;
      intentions?: string;
      missionAlignScore?: number;
      missionAlignNote?: string;
      isoWeek?: string;
    };

    if (
      missionAlignScore != null &&
      (typeof missionAlignScore !== 'number' || missionAlignScore < 1 || missionAlignScore > 5)
    ) {
      return NextResponse.json({ error: 'missionAlignScore must be 1-5' }, { status: 400 });
    }

    const week = isoWeek || isoWeekPKT();

    const [existing] = await db.select().from(weeklyReview).where(eq(weeklyReview.isoWeek, week));

    const values = {
      wentWell: wentWell ?? '',
      wentWrong: wentWrong ?? '',
      distractions: distractions ?? '',
      mustImprove: mustImprove ?? '',
      intentions: intentions ?? '',
      missionAlignScore: missionAlignScore ?? null,
      missionAlignNote: missionAlignNote ?? '',
    };

    let result;
    if (existing) {
      [result] = await db
        .update(weeklyReview)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(weeklyReview.isoWeek, week))
        .returning();
    } else {
      [result] = await db
        .insert(weeklyReview)
        .values({ isoWeek: week, ...values })
        .returning();
    }

    return NextResponse.json({ week: result });
  } catch (err) {
    console.error('review POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
