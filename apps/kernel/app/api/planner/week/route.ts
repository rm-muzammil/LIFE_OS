import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { buildTodayTimeline, commitmentsForDate } from '@/lib/planner/blocks';
import { getPrayerTimes } from '@/lib/planner/prayer';
import {
  getPlannerSettings,
  listCommitmentExceptions,
  listCommitments,
} from '@/lib/planner/repo';
import { addCalendarDays, isPlannerDate, weekdayForDate } from '@/lib/planner/time';
import { todayPKT } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requestedStart = request.nextUrl.searchParams.get('start');
  const anchor = requestedStart ?? todayPKT();
  if (!isPlannerDate(anchor)) {
    return NextResponse.json({ error: 'start must be a valid YYYY-MM-DD date' }, { status: 400 });
  }

  const start = addCalendarDays(anchor, -weekdayForDate(anchor));
  const dates = Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
  const [settings, commitments] = await Promise.all([
    getPlannerSettings(userId),
    listCommitments(userId),
  ]);
  const days = await Promise.all(dates.map(async (date) => {
    const [prayers, exceptions] = await Promise.all([
      getPrayerTimes(userId, date),
      listCommitmentExceptions(userId, date),
    ]);
    const timeline = buildTodayTimeline({
      date,
      settings,
      prayers,
      commitments,
      cancelledCommitmentIds: new Set(exceptions.map((exception) => exception.commitmentId)),
    });
    return {
      ...timeline,
      prayers,
      freeMinutes: timeline.gaps.reduce((sum, gap) => sum + gap.minutes, 0),
      occurrences: commitmentsForDate(
        date,
        commitments,
        new Set(exceptions.map((exception) => exception.commitmentId))
      ),
    };
  }));
  return NextResponse.json({
    start,
    settings,
    days,
    totalFreeMinutes: days.reduce((sum, day) => sum + day.freeMinutes, 0),
  }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });
}
