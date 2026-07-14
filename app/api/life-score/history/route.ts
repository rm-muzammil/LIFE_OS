import { NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { eq, gte } from 'drizzle-orm';
import { isoWeekPKT } from '@/lib/time';

// Approximates a historical weighted life score per ISO week using
// province_daily_snapshots (character/mission internal scores are not
// backfilled historically, so only the province-weighted portion is shown).
export async function GET() {
  try {
    const activeProvinces = await db.select().from(provinces).where(eq(provinces.active, true));
    const weightBySlug = new Map(activeProvinces.map((p) => [p.slug, p.weight]));
    const totalWeight = activeProvinces.reduce((s, p) => s + p.weight, 0);

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);

    const snapshots = await db
      .select()
      .from(provinceDailySnapshots)
      .where(gte(provinceDailySnapshots.date, sinceStr));

    // Group by ISO week -> slug -> [scores]
    const weekMap = new Map<string, Map<string, number[]>>();
    for (const s of snapshots) {
      const week = isoWeekPKT(new Date(s.date));
      if (!weekMap.has(week)) weekMap.set(week, new Map());
      const slugMap = weekMap.get(week)!;
      if (!slugMap.has(s.slug)) slugMap.set(s.slug, []);
      slugMap.get(s.slug)!.push(s.score);
    }

    const weeks = Array.from(weekMap.keys()).sort();
    const last12 = weeks.slice(-12);

    const history = last12.map((week) => {
      const slugMap = weekMap.get(week)!;
      let weightedSum = 0;
      for (const [slug, scores] of slugMap.entries()) {
        const weight = weightBySlug.get(slug);
        if (!weight) continue;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        weightedSum += avg * weight;
      }
      const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
      return { isoWeek: week, score };
    });

    return NextResponse.json({ history });
  } catch (err) {
    console.error('life-score/history GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
