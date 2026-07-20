import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailySchedule } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { todayPKT, nowPKT } from '@/lib/time';
import { computeVisibleTasks, sweepMissedPrayers } from '@/lib/scheduler';
import type { ScheduledTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const date = todayPKT();
    const rows = await db.select().from(dailySchedule).where(eq(dailySchedule.date, date)).limit(1);

    if (!rows[0]) {
      return NextResponse.json(
        { date, exists: false, tasks: [], visible: [], missed: [], upcoming: [], done: [] },
        { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
      );
    }

    const row = rows[0];
    const now = nowPKT();
    let tasks = (row.tasks as ScheduledTask[]) ?? [];

    // Sweep any prayer whose window has silently closed since last view.
    const sweptTasks = sweepMissedPrayers(tasks, now);
    if (JSON.stringify(sweptTasks) !== JSON.stringify(tasks)) {
      tasks = sweptTasks;
      await db.update(dailySchedule).set({ tasks }).where(eq(dailySchedule.date, date));
    }

    const { visible, missed, upcoming, done } = computeVisibleTasks(tasks, now);

    return NextResponse.json(
      {
        date,
        exists: true,
        status: row.status,
        generationError: row.generationError,
        generatedAt: row.generatedAt.toISOString(),
        tasks,
        visible,
        missed,
        upcoming,
        done,
      },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  } catch (err) {
    console.error('scheduler/today GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
