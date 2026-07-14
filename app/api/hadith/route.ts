import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hadithLog } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { isoWeekPKT } from '@/lib/time';

export async function GET() {
  try {
    const rows = await db.select().from(hadithLog).orderBy(desc(hadithLog.isoWeek));
    return NextResponse.json({ weeks: rows });
  } catch (err) {
    console.error('hadith GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { arabicText, translation, source, reflection, isoWeek } = body as {
      arabicText?: string;
      translation?: string;
      source?: string;
      reflection?: string;
      isoWeek?: string;
    };

    const week = isoWeek || isoWeekPKT();

    const [existing] = await db.select().from(hadithLog).where(eq(hadithLog.isoWeek, week));

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
        .where(eq(hadithLog.isoWeek, week))
        .returning();
    } else {
      [result] = await db
        .insert(hadithLog)
        .values({ isoWeek: week, ...values })
        .returning();
    }

    return NextResponse.json({ week: result });
  } catch (err) {
    console.error('hadith POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
