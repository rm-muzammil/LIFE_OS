import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hadithLog } from '@/db/schema';
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
      .from(hadithLog)
      .where(eq(hadithLog.userId, userId))
      .orderBy(desc(hadithLog.isoWeek));
    return NextResponse.json({ weeks: rows }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });
  } catch (err) {
    console.error('hadith GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { arabicText, translation, source, reflection, isoWeek } = body as {
      arabicText?: string;
      translation?: string;
      source?: string;
      reflection?: string;
      isoWeek?: string;
    };

    const week = isoWeek || isoWeekPKT();

    const [existing] = await db
      .select()
      .from(hadithLog)
      .where(and(eq(hadithLog.userId, userId), eq(hadithLog.isoWeek, week)));

    const values = {
      arabicText: arabicText ?? '',
      translation: translation ?? '',
      source: source ?? '',
      reflection: reflection ?? '',
    };

    let result;
    if (existing) {
      [result] = await db
        .update(hadithLog)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(hadithLog.userId, userId), eq(hadithLog.isoWeek, week)))
        .returning();
    } else {
      [result] = await db
        .insert(hadithLog)
        .values({ userId, isoWeek: week, ...values })
        .returning();
    }

    return NextResponse.json({ week: result });
  } catch (err) {
    console.error('hadith POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
