import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { faithDhikrCounts, type FaithDailyLog } from '@/db/schema';
import {
  defaultDailyLog,
  getDailyLog,
  saveDailyLog,
  type FaithDailyLogInput,
} from '@/lib/faith/daily-log';

const ADHKAR_COUNTS: Record<string, number> = {
  morning_: 12,
  evening_: 12,
  sleep_: 10,
};

function toDailyLogInput(row: FaithDailyLog): FaithDailyLogInput {
  const {
    id: _id,
    userId: _userId,
    finalScore: _finalScore,
    rawScore: _rawScore,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = row;
  return input;
}

async function allEntriesCompleted(
  userId: string,
  date: string,
  prefix: string,
  total: number
): Promise<boolean> {
  const expectedKeys = Array.from({ length: total }, (_, index) => `${prefix}${index + 1}`);
  const completedRows = await db
    .select({ dhikrKey: faithDhikrCounts.dhikrKey })
    .from(faithDhikrCounts)
    .where(
      and(
        eq(faithDhikrCounts.userId, userId),
        eq(faithDhikrCounts.date, date),
        eq(faithDhikrCounts.completed, true),
        inArray(faithDhikrCounts.dhikrKey, expectedKeys)
      )
    );
  return new Set(completedRows.map((row) => row.dhikrKey)).size === total;
}

export async function syncDailyLogFromDhikr(
  userId: string,
  date: string,
  dhikrKey: string,
  completed: boolean
): Promise<void> {
  if (!completed) return;

  const flags: Partial<Pick<
    FaithDailyLogInput,
    'laIlaha' | 'subhanallahi' | 'morningAdhkar' | 'eveningAdhkar' | 'beforeSleepAdhkar'
  >> = {};

  if (dhikrKey === 'la_ilaha') flags.laIlaha = true;
  if (dhikrKey === 'subhanallah') flags.subhanallahi = true;
  for (const [prefix, total] of Object.entries(ADHKAR_COUNTS)) {
    if (!dhikrKey.startsWith(prefix) || !(await allEntriesCompleted(userId, date, prefix, total))) {
      continue;
    }
    if (prefix === 'morning_') flags.morningAdhkar = true;
    if (prefix === 'evening_') flags.eveningAdhkar = true;
    if (prefix === 'sleep_') flags.beforeSleepAdhkar = true;
  }

  if (Object.keys(flags).length === 0) return;
  const existing = await getDailyLog(userId, date);
  const input = existing ? toDailyLogInput(existing) : defaultDailyLog(date);
  let changed = false;
  for (const [key, value] of Object.entries(flags) as Array<[keyof typeof flags, true]>) {
    if (input[key] !== true) {
      input[key] = value;
      changed = true;
    }
  }
  if (changed) await saveDailyLog(userId, input);
}
