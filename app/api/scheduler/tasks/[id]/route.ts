import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailySchedule } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { todayPKT, nowPKT } from '@/lib/time';
import { rescheduleTask } from '@/lib/scheduler';
import type { ScheduledTask, TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PatchBody {
  status: TaskStatus;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as PatchBody;
    if (!['done', 'missed', 'pending', 'rescheduled'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const date = todayPKT();
    const rows = await db.select().from(dailySchedule).where(eq(dailySchedule.date, date)).limit(1);
    if (!rows[0]) {
      return NextResponse.json({ error: 'No schedule for today' }, { status: 404 });
    }

    const tasks = (rows[0].tasks as ScheduledTask[]) ?? [];
    const idx = tasks.findIndex((t) => t.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[idx];
    let updated: ScheduledTask;

    if (body.status === 'missed' && task.type !== 'prayer') {
      // Non-prayer misses get rescheduled per spec rule 5, not left as "missed".
      updated = rescheduleTask(task, nowPKT());
    } else {
      updated = { ...task, status: body.status };
    }

    const newTasks = [...tasks];
    newTasks[idx] = updated;

    await db.update(dailySchedule).set({ tasks: newTasks }).where(eq(dailySchedule.date, date));

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error('scheduler/tasks PATCH error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
