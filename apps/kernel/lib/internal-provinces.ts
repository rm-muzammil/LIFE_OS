import { computeWealthScore } from '@/lib/wealth/score';
import { computePersonalScore } from '@/lib/personal/score';
import { computeRelationshipsScore } from '@/lib/relationships/score';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { todayPKT } from '@/lib/time';
import type { ProvinceReportPayload } from '@/lib/types';

type InternalProvinceScorer = (
  userId: string
) => Promise<Omit<ProvinceReportPayload, 'userId'>>;

export const INTERNAL_PROVINCES: Partial<Record<string, InternalProvinceScorer>> = {
  wealth: computeWealthScore,
  personal: computePersonalScore,
  relationships: computeRelationshipsScore,
};

export async function refreshInternalProvince(userId: string, slug: string): Promise<void> {
  const computeScore = INTERNAL_PROVINCES[slug];
  if (!computeScore) throw new Error(`No internal scorer registered for '${slug}'.`);

  const payload = await computeScore(userId);
  const now = new Date();
  const details = {
    ...(payload.details ?? {}),
    streak: payload.streak,
    todayDone: payload.todayDone,
  };
  const updated = await db
    .update(provinces)
    .set({
      cachedScore: payload.score,
      cachedDetails: details,
      cachedAt: now,
      lastPulledAt: now,
    })
    .where(and(eq(provinces.userId, userId), eq(provinces.slug, slug)))
    .returning({ id: provinces.id });
  if (updated.length === 0) {
    throw new Error(`No '${slug}' province row exists for the authenticated user.`);
  }

  await db
    .insert(provinceDailySnapshots)
    .values({ userId, date: todayPKT(), slug, score: payload.score, details })
    .onConflictDoUpdate({
      target: [
        provinceDailySnapshots.userId,
        provinceDailySnapshots.date,
        provinceDailySnapshots.slug,
      ],
      set: { score: payload.score, details },
    });
}
