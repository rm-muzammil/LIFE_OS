import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roadmapTasks } from '@/db/schema';
import { addDays, todayPKT } from '@/lib/faith/date';

export interface RoadmapReport {
  score: number;
  label: 'Roadmap';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: {
    todayTotal: number;
    todayCompleted: number;
    activeTasks: number;
    completedTasks: number;
  };
}

export async function computeRoadmapScore(userId: string): Promise<RoadmapReport> {
  const today = todayPKT();
  const completedDate = sql<string>`to_char(${roadmapTasks.completedAt} AT TIME ZONE 'Asia/Karachi', 'YYYY-MM-DD')`;
  const [todayTasks, completedDays, activeTasks, completedTasks] = await Promise.all([
    db
      .select({ status: roadmapTasks.status })
      .from(roadmapTasks)
      .where(and(
        eq(roadmapTasks.userId, userId),
        eq(roadmapTasks.dueDate, today),
        sql`${roadmapTasks.status} IN ('todo', 'done')`
      )),
    db
      .select({ date: completedDate })
      .from(roadmapTasks)
      .where(and(eq(roadmapTasks.userId, userId), isNotNull(roadmapTasks.completedAt)))
      .groupBy(completedDate),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(roadmapTasks)
      .where(and(eq(roadmapTasks.userId, userId), eq(roadmapTasks.status, 'todo'))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(roadmapTasks)
      .where(and(eq(roadmapTasks.userId, userId), eq(roadmapTasks.status, 'done'))),
  ]);

  const todayCompleted = todayTasks.filter((task) => task.status === 'done').length;
  const todayTotal = todayTasks.filter((task) => task.status === 'todo').length;
  const todayActionable = todayTasks.length;
  const todayDone = todayActionable > 0 && todayTotal === 0;
  const score =
    todayActionable === 0
      ? 0
      : Math.round((todayCompleted / todayActionable) * 100);

  const completed = new Set(completedDays.map((row) => row.date));
  let cursor = today;
  if (!completed.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!completed.has(cursor)) cursor = '';
  }
  let streak = 0;
  while (cursor && completed.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    score,
    label: 'Roadmap',
    streak,
    todayDone,
    updatedAt: new Date().toISOString(),
    details: {
      todayTotal,
      todayCompleted,
      activeTasks: activeTasks[0]?.count ?? 0,
      completedTasks: completedTasks[0]?.count ?? 0,
    },
  };
}
