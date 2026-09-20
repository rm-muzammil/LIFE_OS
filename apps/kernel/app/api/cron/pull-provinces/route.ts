import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { todayPKT } from '@/lib/time';
import type { ProvinceReportPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel cron sends an Authorization: Bearer {CRON_SECRET} header when CRON_SECRET is set.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await db.select().from(provinces).where(eq(provinces.active, true));
  const date = todayPKT();

  const results = await Promise.allSettled(
    active.map(async (p) => {
      if (!p.url) throw new Error(`${p.slug} has no url configured`);

      const res = await fetch(`${p.url.replace(/\/$/, '')}/api/report`, {
        headers: {
          Authorization: `Bearer ${p.pullSecret}`,
          'X-User-Id': p.userId,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`${p.slug} responded ${res.status}`);
      }

      const payload = (await res.json()) as ProvinceReportPayload;
      const now = new Date();
      const details = {
        ...(payload.details ?? {}),
        streak: payload.streak,
        todayDone: payload.todayDone,
      };

      await db
        .update(provinces)
        .set({
          cachedScore: payload.score,
          cachedDetails: details,
          cachedAt: now,
          lastPulledAt: now,
        })
        .where(eq(provinces.id, p.id));

      await db
        .insert(provinceDailySnapshots)
        .values({ userId: p.userId, date, slug: p.slug, score: payload.score, details })
        .onConflictDoUpdate({
          target: [provinceDailySnapshots.userId, provinceDailySnapshots.date, provinceDailySnapshots.slug],
          set: { score: payload.score, details },
        });

      return { slug: p.slug, score: payload.score };
    })
  );

  const summary = results.map((r, i) => ({
    slug: active[i].slug,
    ok: r.status === 'fulfilled',
    error: r.status === 'rejected' ? String(r.reason) : undefined,
  }));

  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}
