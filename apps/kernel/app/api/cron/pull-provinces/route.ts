import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { todayPKT } from '@/lib/time';
import type { ProvinceReportPayload } from '@/lib/types';
import { INTERNAL_PROVINCES } from '@/lib/internal-provinces';

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
      const computeInternalScore = INTERNAL_PROVINCES[p.slug];
      if (!computeInternalScore) {
        console.warn('pull-provinces: skipping unregistered province slug', p.slug);
        return { slug: p.slug, skipped: true as const };
      }

      const payload: Omit<ProvinceReportPayload, 'userId'> = await computeInternalScore(p.userId);
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
        .where(and(eq(provinces.id, p.id), eq(provinces.userId, p.userId)));

      await db
        .insert(provinceDailySnapshots)
        .values({ userId: p.userId, date, slug: p.slug, score: payload.score, details })
        .onConflictDoUpdate({
          target: [provinceDailySnapshots.userId, provinceDailySnapshots.date, provinceDailySnapshots.slug],
          set: { score: payload.score, details },
        });

      return { slug: p.slug, score: payload.score, skipped: false as const };
    })
  );

  const summary = results.map((result, index) => {
    if (result.status === 'rejected') {
      return { slug: active[index].slug, ok: false, error: String(result.reason) };
    }
    if (result.value.skipped) {
      return { slug: result.value.slug, ok: true, skipped: true };
    }
    return {
      slug: result.value.slug,
      ok: true,
      skipped: false,
      score: result.value.score,
    };
  });

  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}
