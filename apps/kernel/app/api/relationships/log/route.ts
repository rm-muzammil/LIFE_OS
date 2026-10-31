import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { relationshipsDailyLogs, relationshipsSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { refreshRelationshipsProvinceScore } from '@/lib/relationships/api';
import { todayPKT, weeklyReflectionKey } from '@/lib/relationships/date';
import { buildRelationshipsReport } from '@/lib/relationships/score';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date') ?? todayPKT();
  const [log] = await db
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
    .where(and(eq(relationshipsDailyLogs.userId, userId), eq(relationshipsDailyLogs.date, date)))
    .limit(1);
  const key = weeklyReflectionKey(date);
  const [reflection] = await db
    .select({ value: relationshipsSettings.value })
    .from(relationshipsSettings)
    .where(and(eq(relationshipsSettings.userId, userId), eq(relationshipsSettings.key, key)))
    .limit(1);

  return NextResponse.json({
    date,
    log: log ?? null,
    weeklyReflection: reflection?.value ?? '',
    weeklyReflectionKey: key,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const date = payload.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 });
  }

  for (const key of [
    'contactedParents',
    'familyTies',
    'helpedSomeone',
    'goodDeed',
    'communityObligation',
  ] as const) {
    if (key in payload && typeof payload[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
  }
  for (const key of ['charityAmount', 'goodDeedsCount'] as const) {
    if (key in payload && (typeof payload[key] !== 'number' || !Number.isFinite(payload[key]))) {
      return NextResponse.json({ error: `${key} must be a finite number` }, { status: 400 });
    }
  }
  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string' }, { status: 400 });
  }
  if (payload.weeklyReflection !== undefined && typeof payload.weeklyReflection !== 'string') {
    return NextResponse.json({ error: 'weeklyReflection must be a string' }, { status: 400 });
  }

  const values = {
    date,
    contactedParents: payload.contactedParents === true,
    familyTies: payload.familyTies === true,
    helpedSomeone: payload.helpedSomeone === true,
    goodDeed: payload.goodDeed === true,
    communityObligation: payload.communityObligation === true,
    charityAmount:
      typeof payload.charityAmount === 'number' ? Math.max(0, Math.trunc(payload.charityAmount)) : 0,
    goodDeedsCount:
      typeof payload.goodDeedsCount === 'number' ? Math.max(0, Math.trunc(payload.goodDeedsCount)) : 0,
    notes: typeof payload.notes === 'string' ? payload.notes : '',
    updatedAt: new Date(),
  };
  await db
    .insert(relationshipsDailyLogs)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [relationshipsDailyLogs.userId, relationshipsDailyLogs.date],
      set: values,
    });

  if (typeof payload.weeklyReflection === 'string') {
    await db
      .insert(relationshipsSettings)
      .values({
        userId,
        key: weeklyReflectionKey(date),
        value: payload.weeklyReflection,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [relationshipsSettings.userId, relationshipsSettings.key],
        set: { value: payload.weeklyReflection, updatedAt: new Date() },
      });
  }

  const report = await buildRelationshipsReport(userId, date);
  await refreshRelationshipsProvinceScore(userId);
  return NextResponse.json({ ok: true, report });
}
