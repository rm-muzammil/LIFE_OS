import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prayerTimes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULTS = { fajr: '05:20', dhuhr: '13:00', asr: '16:45', maghrib: '19:30', isha: '21:00' };

export async function GET() {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db.select().from(prayerTimes).where(eq(prayerTimes.userId, userId)).limit(1);
    const row = rows[0] ?? { id: null, ...DEFAULTS, updatedAt: null };
    return NextResponse.json(row, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });
  } catch (err) {
    console.error('prayer-times GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

interface PostBody {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function POST(req: NextRequest) {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as PostBody;
    for (const key of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      if (!TIME_RE.test(body[key])) {
        return NextResponse.json({ error: `Invalid time for ${key}, expected HH:MM` }, { status: 400 });
      }
    }

    const existing = await db.select().from(prayerTimes).where(eq(prayerTimes.userId, userId)).limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(prayerTimes)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(prayerTimes.userId, userId))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db.insert(prayerTimes).values({ userId, ...body }).returning();
    return NextResponse.json(created);
  } catch (err) {
    console.error('prayer-times POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
