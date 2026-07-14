import { NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces } from '@/db/schema';
import { isStale } from '@/lib/time';
import type { ProvinceWithMeta } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(provinces).orderBy(provinces.createdAt);

    const result: ProvinceWithMeta[] = rows.map((p) => {
      const details = (p.cachedDetails ?? {}) as Record<string, unknown>;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        url: p.url,
        weight: p.weight,
        active: p.active,
        cachedScore: p.cachedScore,
        cachedDetails: p.cachedDetails,
        cachedAt: p.cachedAt ? p.cachedAt.toISOString() : null,
        lastPushedAt: p.lastPushedAt ? p.lastPushedAt.toISOString() : null,
        lastPulledAt: p.lastPulledAt ? p.lastPulledAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        streak: typeof details.streak === 'number' ? details.streak : 0,
        todayDone: typeof details.todayDone === 'boolean' ? details.todayDone : false,
        stale: isStale(p.lastPushedAt),
      };
    });

    return NextResponse.json(
  { provinces: result },
  { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
);
  } catch (err) {
    console.error('provinces GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
