import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  computeFaithStreak,
  getDailyLog,
  getLatestRakuCompletedOn,
  getRecentDailyLogs,
  saveDailyLog,
  type FaithDailyLogInput,
} from '@/lib/faith/daily-log';
import { isDateString } from '@/lib/faith/date';
import { advanceFaithVerseIndexOnce } from '@/lib/faith/settings';
import { isFiniteInteger, isRecord } from '@/lib/faith/validation';
import { refreshFaithProvinceScore } from '@/lib/faith/refresh';

export const dynamic = 'force-dynamic';

const BOOLEAN_FIELDS = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'morningAdhkar',
  'eveningAdhkar',
  'beforeSleepAdhkar',
  'laIlaha',
  'subhanallahi',
  'tafseerDone',
  'verseDone',
  'surahMulk',
  'surahKahf',
  'haramFree',
] as const;

const INTEGER_FIELDS = [
  'onTime',
  'dhikrMinutes',
  'duaMinutes',
  'quranPages',
  'tadabburMinutes',
  'tajweedConfidence',
  'islamicStudyMinutes',
  'gazeLowered',
] as const;

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 });
  }
  if (!isDateString(date)) {
    return NextResponse.json({ error: 'date must use YYYY-MM-DD format' }, { status: 400 });
  }

  const log = await getDailyLog(userId, date);
  return NextResponse.json(log);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  if (!isDateString(body.date)) {
    return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 });
  }
  for (const key of BOOLEAN_FIELDS) {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
  }
  for (const key of INTEGER_FIELDS) {
    if (body[key] !== undefined && !isFiniteInteger(body[key])) {
      return NextResponse.json({ error: `${key} must be an integer` }, { status: 400 });
    }
  }

  const input = Object.fromEntries(
    BOOLEAN_FIELDS.map((key) => [key, body[key] === true])
  ) as Pick<FaithDailyLogInput, (typeof BOOLEAN_FIELDS)[number]>;
  const numericValues = Object.fromEntries(
    INTEGER_FIELDS.map((key) => [key, isFiniteInteger(body[key]) ? body[key] : 0])
  ) as Pick<FaithDailyLogInput, (typeof INTEGER_FIELDS)[number]>;
  const fields: FaithDailyLogInput = {
    date: body.date,
    ...input,
    ...numericValues,
  };

  const raku = await getLatestRakuCompletedOn(userId, fields.date);
  if (raku) {
    fields.tafseerDone = true;
    fields.tajweedConfidence = Math.max(fields.tajweedConfidence ?? 0, raku.tajweedConfidence);
  }

  const row = await saveDailyLog(userId, fields);
  if (fields.verseDone) {
    await advanceFaithVerseIndexOnce(userId, fields.date, 564);
  }
  const streak = await computeFaithStreak(userId, fields.date);
  await refreshFaithProvinceScore(userId);
  return NextResponse.json({ ok: true, score: row.finalScore, streak, row });
}
