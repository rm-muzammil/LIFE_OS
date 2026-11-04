import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { buildTodayTimeline } from '@/lib/planner/blocks';
import { getPrayerTimes } from '@/lib/planner/prayer';
import {
  getPlannerSettings,
  listCommitmentExceptions,
  listCommitments,
} from '@/lib/planner/repo';
import { todayPKT } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const date = todayPKT();
  const [settings, prayers, commitments, exceptions] = await Promise.all([
    getPlannerSettings(userId),
    getPrayerTimes(userId, date),
    listCommitments(userId),
    listCommitmentExceptions(userId, date),
  ]);
  const timeline = buildTodayTimeline({
    date,
    settings,
    prayers,
    commitments,
    cancelledCommitmentIds: new Set(exceptions.map((exception) => exception.commitmentId)),
  });
  return NextResponse.json({ ...timeline, settings, prayers }, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}
