import type { DailyLog } from '@/lib/relationships/types';

export const POINTS = {
  contactedParents: 25,
  familyTies: 20,
  helpedSomeone: 15,
  goodDeed: 15,
  communityObligation: 10,
} as const;

export const BASE_MAX = 85;
export const WEEKLY_BONUS = 15;
export const SCORE_CAP = 100;

export type ScoreBreakdown = {
  base: number;
  weeklyBonus: number;
  total: number;
};

type ScoredActions = Pick<DailyLog, keyof typeof POINTS>;

export function baseScore(log: ScoredActions): number {
  return (Object.keys(POINTS) as (keyof typeof POINTS)[]).reduce(
    (total, key) => total + (log[key] ? POINTS[key] : 0),
    0
  );
}

export function scoreFor(log: ScoredActions, weeklyReflectionWritten: boolean): ScoreBreakdown {
  const base = baseScore(log);
  const weeklyBonus = weeklyReflectionWritten ? WEEKLY_BONUS : 0;
  return { base, weeklyBonus, total: Math.min(SCORE_CAP, base + weeklyBonus) };
}

export function computeStreak(
  fromDate: string,
  logsByDate: Map<string, ScoredActions>,
  addDaysFn: (date: string, days: number) => string
): number {
  let streak = 0;
  let cursor = fromDate;
  const startingLog = logsByDate.get(cursor);
  if (!startingLog || baseScore(startingLog) === 0) cursor = addDaysFn(cursor, -1);

  let log = logsByDate.get(cursor);
  while (log && baseScore(log) > 0) {
    streak += 1;
    cursor = addDaysFn(cursor, -1);
    log = logsByDate.get(cursor);
  }
  return streak;
}
