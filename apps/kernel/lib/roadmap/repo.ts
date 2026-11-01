import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  roadmapGoals,
  roadmapImportBatches,
  roadmapMilestones,
  roadmapTasks,
} from '@/db/schema';
import { addDays, todayPKT } from '@/lib/faith/date';
import {
  ROADMAP_DOMAINS,
  type RoadmapDomain,
  type RoadmapGoalStatus,
  type RoadmapPriority,
  type RoadmapTaskStatus,
} from '@/lib/roadmap/types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isRoadmapDomain(value: unknown): value is RoadmapDomain {
  return typeof value === 'string' && ROADMAP_DOMAINS.some((domain) => domain === value);
}

export function isRoadmapPriority(value: unknown): value is RoadmapPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}

export function isGoalStatus(value: unknown): value is RoadmapGoalStatus {
  return value === 'active' || value === 'done' || value === 'paused';
}

export function isTaskStatus(value: unknown): value is RoadmapTaskStatus {
  return value === 'todo' || value === 'done' || value === 'skipped' || value === 'suggested';
}

export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
}

export async function listGoals(userId: string) {
  return db
    .select()
    .from(roadmapGoals)
    .where(eq(roadmapGoals.userId, userId))
    .orderBy(
      sql`case ${roadmapGoals.status} when 'active' then 0 when 'paused' then 1 else 2 end`,
      asc(roadmapGoals.dueDate),
      asc(roadmapGoals.createdAt)
    );
}

export async function getGoal(userId: string, id: string) {
  const [goal] = await db
    .select()
    .from(roadmapGoals)
    .where(and(eq(roadmapGoals.userId, userId), eq(roadmapGoals.id, id)))
    .limit(1);
  return goal ?? null;
}

export async function getGoalDetail(userId: string, id: string) {
  const goal = await getGoal(userId, id);
  if (!goal) return null;
  const milestones = await db
    .select()
    .from(roadmapMilestones)
    .where(and(
      eq(roadmapMilestones.userId, userId),
      eq(roadmapMilestones.goalId, id)
    ))
    .orderBy(asc(roadmapMilestones.dueDate), asc(roadmapMilestones.createdAt));
  const milestoneIds = milestones.map((milestone) => milestone.id);
  const tasks = await db
    .select()
    .from(roadmapTasks)
    .where(and(
      eq(roadmapTasks.userId, userId),
      or(
        eq(roadmapTasks.goalId, id),
        ...(milestoneIds.length > 0 ? [inArray(roadmapTasks.milestoneId, milestoneIds)] : [])
      )!
    ))
    .orderBy(asc(roadmapTasks.dueDate), asc(roadmapTasks.createdAt));
  return { goal, milestones, tasks };
}

export async function listMilestones(userId: string, goalId?: string) {
  return db
    .select()
    .from(roadmapMilestones)
    .where(goalId
      ? and(eq(roadmapMilestones.userId, userId), eq(roadmapMilestones.goalId, goalId))
      : eq(roadmapMilestones.userId, userId))
    .orderBy(asc(roadmapMilestones.dueDate), asc(roadmapMilestones.createdAt));
}

export async function getMilestone(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(roadmapMilestones)
    .where(and(eq(roadmapMilestones.userId, userId), eq(roadmapMilestones.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listTasks(
  userId: string,
  filters: { domain?: RoadmapDomain; status?: RoadmapTaskStatus; due?: string } = {}
) {
  const clauses = [eq(roadmapTasks.userId, userId)];
  if (filters.domain) clauses.push(eq(roadmapTasks.domain, filters.domain));
  if (filters.status) clauses.push(eq(roadmapTasks.status, filters.status));
  const today = todayPKT();
  if (filters.due === 'today') {
    clauses.push(eq(roadmapTasks.dueDate, today));
  } else if (filters.due === 'overdue') {
    clauses.push(and(lt(roadmapTasks.dueDate, today), eq(roadmapTasks.status, 'todo'))!);
  } else if (filters.due === 'upcoming') {
    clauses.push(and(gt(roadmapTasks.dueDate, today), isNotNull(roadmapTasks.dueDate))!);
  }
  return db
    .select()
    .from(roadmapTasks)
    .where(and(...clauses))
    .orderBy(asc(roadmapTasks.dueDate), asc(roadmapTasks.createdAt));
}

export async function getTask(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(roadmapTasks)
    .where(and(eq(roadmapTasks.userId, userId), eq(roadmapTasks.id, id)))
    .limit(1);
  return row ?? null;
}

async function countRows(query: Promise<Array<{ value: number }>>): Promise<number> {
  const [result] = await query;
  return result?.value ?? 0;
}

export async function getOverview(userId: string) {
  const today = todayPKT();
  const upcomingThrough = addDays(today, 7);
  const open = eq(roadmapTasks.status, 'todo');
  const [goals, goalCount, doneGoalCount, milestoneCount, doneMilestoneCount, taskCount,
    doneTaskCount, todayTasks, overdueTasks, upcomingTasks, upcomingMilestones] = await Promise.all([
    listGoals(userId),
    countRows(db.select({ value: count() }).from(roadmapGoals).where(eq(roadmapGoals.userId, userId))),
    countRows(db.select({ value: count() }).from(roadmapGoals).where(and(
      eq(roadmapGoals.userId, userId),
      eq(roadmapGoals.status, 'done')
    ))),
    countRows(db.select({ value: count() }).from(roadmapMilestones).where(eq(roadmapMilestones.userId, userId))),
    countRows(db.select({ value: count() }).from(roadmapMilestones).where(and(
      eq(roadmapMilestones.userId, userId),
      eq(roadmapMilestones.status, 'done')
    ))),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      ne(roadmapTasks.status, 'suggested')
    ))),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      eq(roadmapTasks.status, 'done')
    ))),
    db.select().from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      open,
      eq(roadmapTasks.dueDate, today)
    )).orderBy(asc(roadmapTasks.priority), asc(roadmapTasks.createdAt)),
    db.select().from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      open,
      lt(roadmapTasks.dueDate, today)
    )).orderBy(asc(roadmapTasks.dueDate)),
    db.select().from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      open,
      gt(roadmapTasks.dueDate, today),
      lte(roadmapTasks.dueDate, upcomingThrough)
    )).orderBy(asc(roadmapTasks.dueDate)),
    db.select().from(roadmapMilestones).where(and(
      eq(roadmapMilestones.userId, userId),
      eq(roadmapMilestones.status, 'active'),
      gt(roadmapMilestones.dueDate, today)
    )).orderBy(asc(roadmapMilestones.dueDate)).limit(5),
  ]);
  return {
    empty: taskCount === 0,
    progress: {
      goals: { total: goalCount, done: doneGoalCount },
      milestones: { total: milestoneCount, done: doneMilestoneCount },
      tasks: { total: taskCount, done: doneTaskCount },
    },
    dueToday: todayTasks,
    overdue: overdueTasks,
    upcomingTasks,
    upcomingMilestones,
    goals,
  };
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapGoalStatus;
    startDate: string | null;
    dueDate: string | null;
  }
) {
  const [row] = await db.insert(roadmapGoals).values({
    userId,
    ...input,
    source: 'manual',
    completedAt: input.status === 'done' ? new Date() : null,
  }).returning();
  return row;
}

export async function updateGoal(
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapGoalStatus;
    startDate: string | null;
    dueDate: string | null;
  }>
) {
  const [row] = await db
    .update(roadmapGoals)
    .set({
      ...input,
      ...(input.status === undefined ? {} : {
        completedAt: input.status === 'done' ? new Date() : null,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(roadmapGoals.userId, userId), eq(roadmapGoals.id, id)))
    .returning();
  return row ?? null;
}

export async function createMilestone(
  userId: string,
  input: {
    goalId: string;
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapGoalStatus;
    startDate: string | null;
    dueDate: string | null;
  }
) {
  const [row] = await db.insert(roadmapMilestones).values({
    userId,
    ...input,
    source: 'manual',
    completedAt: input.status === 'done' ? new Date() : null,
  }).returning();
  return row;
}

export async function updateMilestone(
  userId: string,
  id: string,
  input: Partial<{
    goalId: string;
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapGoalStatus;
    startDate: string | null;
    dueDate: string | null;
  }>
) {
  const [row] = await db
    .update(roadmapMilestones)
    .set({
      ...input,
      ...(input.status === undefined ? {} : {
        completedAt: input.status === 'done' ? new Date() : null,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(roadmapMilestones.userId, userId), eq(roadmapMilestones.id, id)))
    .returning();
  return row ?? null;
}

export async function resolveTaskParentIds(
  userId: string,
  goalId: string | null,
  milestoneId: string | null
): Promise<{ goalId: string | null; milestoneId: string | null } | null> {
  if (!milestoneId) {
    if (!goalId) return { goalId: null, milestoneId: null };
    const [goal] = await db.select({ id: roadmapGoals.id }).from(roadmapGoals).where(and(
      eq(roadmapGoals.userId, userId),
      eq(roadmapGoals.id, goalId)
    )).limit(1);
    return goal ? { goalId, milestoneId: null } : null;
  }

  const [milestone] = await db.select({
    id: roadmapMilestones.id,
    goalId: roadmapMilestones.goalId,
  }).from(roadmapMilestones).where(and(
    eq(roadmapMilestones.userId, userId),
    eq(roadmapMilestones.id, milestoneId)
  )).limit(1);
  if (!milestone || (goalId !== null && goalId !== milestone.goalId)) return null;
  return { goalId: milestone.goalId, milestoneId };
}

export async function createTask(
  userId: string,
  input: {
    goalId: string | null;
    milestoneId: string | null;
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapTaskStatus;
    startDate: string | null;
    dueDate: string | null;
    estimateMinutes: number | null;
  }
) {
  const [row] = await db.insert(roadmapTasks).values({
    userId,
    ...input,
    source: 'manual',
    completedAt: input.status === 'done' ? new Date() : null,
  }).returning();
  return row;
}

export async function updateTask(
  userId: string,
  id: string,
  input: Partial<{
    goalId: string | null;
    milestoneId: string | null;
    title: string;
    description: string | null;
    domain: RoadmapDomain;
    priority: RoadmapPriority;
    status: RoadmapTaskStatus;
    startDate: string | null;
    dueDate: string | null;
    estimateMinutes: number | null;
  }>
) {
  const [row] = await db
    .update(roadmapTasks)
    .set({
      ...input,
      ...(input.status === undefined ? {} : {
        completedAt: input.status === 'done' ? new Date() : null,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(roadmapTasks.userId, userId), eq(roadmapTasks.id, id)))
    .returning();
  return row ?? null;
}

export async function getGoalDeleteCounts(userId: string, goalId: string) {
  const milestoneRows = await db.select({ id: roadmapMilestones.id }).from(roadmapMilestones).where(and(
    eq(roadmapMilestones.userId, userId),
    eq(roadmapMilestones.goalId, goalId)
  ));
  const milestoneIds = milestoneRows.map((row) => row.id);
  const taskClause = or(
    eq(roadmapTasks.goalId, goalId),
    ...(milestoneIds.length > 0 ? [inArray(roadmapTasks.milestoneId, milestoneIds)] : [])
  )!;
  const [milestones, tasks, completedTasks] = await Promise.all([
    Promise.resolve(milestoneIds.length),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      taskClause
    ))),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      taskClause,
      eq(roadmapTasks.status, 'done')
    ))),
  ]);
  return { goals: 1, milestones, tasks, completedTasks };
}

export async function getMilestoneDeleteCounts(userId: string, milestoneId: string) {
  const [tasks, completedTasks] = await Promise.all([
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      eq(roadmapTasks.milestoneId, milestoneId)
    ))),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      eq(roadmapTasks.milestoneId, milestoneId),
      eq(roadmapTasks.status, 'done')
    ))),
  ]);
  return { milestones: 1, tasks, completedTasks };
}

export async function getBatchDeleteCounts(userId: string, batchId: string) {
  const batchGoals = await db.select({ id: roadmapGoals.id }).from(roadmapGoals).where(and(
    eq(roadmapGoals.userId, userId),
    eq(roadmapGoals.importBatchId, batchId)
  ));
  const goalIds = batchGoals.map((row) => row.id);
  const batchMilestones = await db.select({ id: roadmapMilestones.id }).from(roadmapMilestones).where(and(
    eq(roadmapMilestones.userId, userId),
    or(
      eq(roadmapMilestones.importBatchId, batchId),
      ...(goalIds.length > 0 ? [inArray(roadmapMilestones.goalId, goalIds)] : [])
    )!
  ));
  const milestoneIds = batchMilestones.map((row) => row.id);
  const taskClause = or(
      eq(roadmapTasks.importBatchId, batchId),
      ...(goalIds.length > 0 ? [inArray(roadmapTasks.goalId, goalIds)] : []),
      ...(milestoneIds.length > 0 ? [inArray(roadmapTasks.milestoneId, milestoneIds)] : [])
    )!;
  const [milestones, tasks, completedTasks] = await Promise.all([
    Promise.resolve(milestoneIds.length),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      taskClause
    ))),
    countRows(db.select({ value: count() }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      taskClause,
      eq(roadmapTasks.status, 'done')
    ))),
  ]);
  const goals = goalIds.length;
  return { goals, milestones, tasks, completedTasks };
}

export async function listImportBatches(userId: string) {
  return db.select({
    id: roadmapImportBatches.id,
    filename: roadmapImportBatches.filename,
    status: roadmapImportBatches.status,
    rowCount: roadmapImportBatches.rowCount,
    goalCount: roadmapImportBatches.goalCount,
    milestoneCount: roadmapImportBatches.milestoneCount,
    taskCount: roadmapImportBatches.taskCount,
    skippedCount: roadmapImportBatches.skippedCount,
    errorCount: roadmapImportBatches.errorCount,
    createdAt: roadmapImportBatches.createdAt,
    completedAt: roadmapImportBatches.completedAt,
  }).from(roadmapImportBatches)
    .where(eq(roadmapImportBatches.userId, userId))
    .orderBy(sql`${roadmapImportBatches.createdAt} DESC`);
}

export async function getImportBatch(userId: string, id: string) {
  const [row] = await db.select().from(roadmapImportBatches).where(and(
    eq(roadmapImportBatches.userId, userId),
    eq(roadmapImportBatches.id, id)
  )).limit(1);
  return row ?? null;
}

export async function deleteGoal(userId: string, id: string): Promise<boolean> {
  const deleted = await db.delete(roadmapGoals).where(and(
    eq(roadmapGoals.userId, userId),
    eq(roadmapGoals.id, id)
  )).returning({ id: roadmapGoals.id });
  return deleted.length > 0;
}

export async function deleteMilestone(userId: string, id: string): Promise<boolean> {
  const deleted = await db.delete(roadmapMilestones).where(and(
    eq(roadmapMilestones.userId, userId),
    eq(roadmapMilestones.id, id)
  )).returning({ id: roadmapMilestones.id });
  return deleted.length > 0;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const deleted = await db.delete(roadmapTasks).where(and(
    eq(roadmapTasks.userId, userId),
    eq(roadmapTasks.id, id)
  )).returning({ id: roadmapTasks.id });
  return deleted.length > 0;
}

export async function deleteBatch(userId: string, id: string): Promise<boolean> {
  const staleImportCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const deleted = await db.delete(roadmapImportBatches).where(and(
    eq(roadmapImportBatches.userId, userId),
    eq(roadmapImportBatches.id, id),
    or(
      eq(roadmapImportBatches.status, 'done'),
      eq(roadmapImportBatches.status, 'failed'),
      and(
        eq(roadmapImportBatches.status, 'pending'),
        or(
          isNull(roadmapImportBatches.confirmStartedAt),
          lt(roadmapImportBatches.confirmStartedAt, staleImportCutoff)
        )
      )
    )!
  )).returning({ id: roadmapImportBatches.id });
  return deleted.length > 0;
}

export async function findImportedHash(userId: string, contentHash: string) {
  const [row] = await db.select({
    id: roadmapImportBatches.id,
    createdAt: roadmapImportBatches.createdAt,
    completedAt: roadmapImportBatches.completedAt,
    rowCount: roadmapImportBatches.rowCount,
    goalCount: roadmapImportBatches.goalCount,
    milestoneCount: roadmapImportBatches.milestoneCount,
    taskCount: roadmapImportBatches.taskCount,
  }).from(roadmapImportBatches).where(and(
    eq(roadmapImportBatches.userId, userId),
    eq(roadmapImportBatches.contentHash, contentHash),
    eq(roadmapImportBatches.status, 'done')
  )).orderBy(sql`${roadmapImportBatches.completedAt} DESC`).limit(1);
  return row ?? null;
}
