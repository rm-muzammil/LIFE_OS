import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { relationshipsDailyLogs } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { addDays, todayPKT } from '@/lib/relationships/date';
import { baseScore } from '@/lib/relationships/scoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsedDays = Number(req.nextUrl.searchParams.get('days') ?? 30);
  const days = Number.isFinite(parsedDays) ? Math.min(365, Math.max(1, parsedDays)) : 30;
  const today = todayPKT();
  const since = addDays(today, -(days - 1));
  const rows = await db
    .select({
      id: relationshipsDailyLogs.id,
      date: relationshipsDailyLogs.date,
      contactedParents: relationshipsDailyLogs.contactedParents,
      familyTies: relationshipsDailyLogs.familyTies,
      helpedSomeone: relationshipsDailyLogs.helpedSomeone,
      goodDeed: relationshipsDailyLogs.goodDeed,
      communityObligation: relationshipsDailyLogs.communityObligation,
      charityAmount: relationshipsDailyLogs.charityAmount,
      goodDeedsCount: relationshipsDailyLogs.goodDeedsCount,
      notes: relationshipsDailyLogs.notes,
      createdAt: relationshipsDailyLogs.createdAt,
      updatedAt: relationshipsDailyLogs.updatedAt,
    })
    .from(relationshipsDailyLogs)
    .where(
      and(
        eq(relationshipsDailyLogs.userId, userId),
        gte(relationshipsDailyLogs.date, since),
        lte(relationshipsDailyLogs.date, today)
      )
    )
    .orderBy(desc(relationshipsDailyLogs.date));
  const entries = rows.map((row) => ({ ...row, score: baseScore(row) }));

  return NextResponse.json({ entries, since, until: today });
}
