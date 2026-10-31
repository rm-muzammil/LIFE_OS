import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { relationshipsDailyLogs, relationshipsSettings } from '@/db/schema';
import { addDays, todayPKT, weeklyReflectionKey } from '@/lib/relationships/date';
import { computeStreak, scoreFor } from '@/lib/relationships/scoring';
import type { RelationshipsReport } from '@/lib/relationships/types';

export async function buildRelationshipsReport(
  userId: string,
  forDate = todayPKT()
): Promise<RelationshipsReport> {
  const since = addDays(forDate, -60);
  const [rows, reflectionRows] = await Promise.all([
    db
      .select()
      .from(relationshipsDailyLogs)
      .where(
        and(
          eq(relationshipsDailyLogs.userId, userId),
          gte(relationshipsDailyLogs.date, since),
          lte(relationshipsDailyLogs.date, forDate)
        )
      )
      .orderBy(desc(relationshipsDailyLogs.date)),
    db
      .select({ value: relationshipsSettings.value })
      .from(relationshipsSettings)
      .where(
        and(
          eq(relationshipsSettings.userId, userId),
          eq(relationshipsSettings.key, weeklyReflectionKey(forDate))
        )
      )
      .limit(1),
  ]);
  const logsByDate = new Map(rows.map((row) => [row.date, row]));
  const todayRow = logsByDate.get(forDate);
  const weeklyReflectionWritten = Boolean(reflectionRows[0]?.value.trim());
  const { total } = todayRow
    ? scoreFor(todayRow, weeklyReflectionWritten)
    : { total: 0 };

  return {
    score: total,
    label: 'Relationships',
    streak: computeStreak(forDate, logsByDate, addDays),
    todayDone: Boolean(todayRow),
    updatedAt: new Date().toISOString(),
    details: {
      contactedParents: todayRow?.contactedParents ?? false,
      familyTies: todayRow?.familyTies ?? false,
      helpedSomeone: todayRow?.helpedSomeone ?? false,
      goodDeed: todayRow?.goodDeed ?? false,
      communityObligation: todayRow?.communityObligation ?? false,
      charityAmount: todayRow?.charityAmount ?? 0,
      goodDeedsCount: todayRow?.goodDeedsCount ?? 0,
    },
  };
}

export async function computeRelationshipsScore(userId: string): Promise<RelationshipsReport> {
  return buildRelationshipsReport(userId);
}
