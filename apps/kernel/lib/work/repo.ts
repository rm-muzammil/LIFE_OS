import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workDailyLogs, workProjects, type NewWorkDailyLog } from '@/db/schema';
import { addDays, todayPKT } from '@/lib/work/date';
import { computeScore, type ScoreInput } from '@/lib/work/score';
import type { ProjectStatus } from '@/lib/work/types';

export async function getLogByDate(userId: string, date: string) {
  const [row] = await db
    .select()
    .from(workDailyLogs)
    .where(and(eq(workDailyLogs.userId, userId), eq(workDailyLogs.logDate, date)))
    .limit(1);
  return row ?? null;
}

export async function getTodayLog(userId: string) {
  return getLogByDate(userId, todayPKT());
}

export async function getRecentLogs(userId: string, limit = 30) {
  return db
    .select()
    .from(workDailyLogs)
    .where(eq(workDailyLogs.userId, userId))
    .orderBy(desc(workDailyLogs.logDate))
    .limit(limit);
}

export async function upsertLog(
  userId: string,
  input: Omit<NewWorkDailyLog, 'id' | 'userId' | 'score' | 'createdAt' | 'updatedAt'> &
    ScoreInput
) {
  const { total } = computeScore(input);
  const values = {
    ...input,
    userId,
    score: total,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(workDailyLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [workDailyLogs.userId, workDailyLogs.logDate],
      set: {
        logDate: input.logDate,
        deepWorkHours: input.deepWorkHours,
        tasksCompleted: input.tasksCompleted,
        milestoneDone: input.milestoneDone,
        profDevMinutes: input.profDevMinutes,
        noProcrastination: input.noProcrastination,
        clientDeliverable: input.clientDeliverable,
        projectId: input.projectId,
        notes: input.notes,
        score: total,
        updatedAt: values.updatedAt,
      },
    })
    .returning();
  return row;
}

export async function computeStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ logDate: workDailyLogs.logDate })
    .from(workDailyLogs)
    .where(and(eq(workDailyLogs.userId, userId), gt(workDailyLogs.score, 0)))
    .orderBy(desc(workDailyLogs.logDate));
  if (rows.length === 0) return 0;

  const done = new Set(rows.map((row) => row.logDate));
  let cursor = todayPKT();
  if (!done.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!done.has(cursor)) return 0;
  }

  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function listProjects(userId: string) {
  return db
    .select()
    .from(workProjects)
    .where(eq(workProjects.userId, userId))
    .orderBy(
      sql`case ${workProjects.status} when 'active' then 0 when 'paused' then 1 else 2 end`,
      desc(workProjects.createdAt)
    );
}

export async function createProject(
  userId: string,
  input: {
    name: string;
    description: string | null;
    status: ProjectStatus;
    targetDate: string | null;
  }
) {
  const [row] = await db
    .insert(workProjects)
    .values({ userId, ...input })
    .returning();
  return row;
}

export async function projectExists(userId: string, id: string): Promise<boolean> {
  const [project] = await db
    .select({ id: workProjects.id })
    .from(workProjects)
    .where(and(eq(workProjects.userId, userId), eq(workProjects.id, id)))
    .limit(1);
  return Boolean(project);
}

export async function updateProject(
  userId: string,
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    status: ProjectStatus;
    targetDate: string | null;
  }>
) {
  const [existing] = await db
    .select()
    .from(workProjects)
    .where(and(eq(workProjects.userId, userId), eq(workProjects.id, id)))
    .limit(1);
  if (!existing) return null;

  const [row] = await db
    .update(workProjects)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(workProjects.userId, userId), eq(workProjects.id, id)))
    .returning();
  return row;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: workProjects.id })
    .from(workProjects)
    .where(and(eq(workProjects.userId, userId), eq(workProjects.id, id)))
    .limit(1);
  if (!existing) return false;

  await db
    .update(workDailyLogs)
    .set({ projectId: null, updatedAt: new Date() })
    .where(and(eq(workDailyLogs.userId, userId), eq(workDailyLogs.projectId, id)));
  const deleted = await db
    .delete(workProjects)
    .where(and(eq(workProjects.userId, userId), eq(workProjects.id, id)))
    .returning({ id: workProjects.id });
  return deleted.length > 0;
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === 'active' || value === 'paused' || value === 'completed';
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
