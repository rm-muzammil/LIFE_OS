import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { roadmapGoals, roadmapMilestones, roadmapTasks } from '@/db/schema';
import { addDays, todayPKT } from '@/lib/faith/date';

const SCORE_WINDOW_DAYS = 14;

type TaskStatus = 'todo' | 'done' | 'skipped' | 'suggested';
type GoalStatus = 'active' | 'done' | 'paused';
type MilestoneStatus = 'active' | 'done' | 'paused';

export interface RoadmapScoreTask {
  status: TaskStatus;
  dueDate: string | null;
  completedAt: Date | null;
}

export interface RoadmapScoreGoal {
  id: string;
  status: GoalStatus;
}

export interface RoadmapScoreMilestone {
  goalId: string;
  status: MilestoneStatus;
}

export interface RoadmapScoreInput {
  today: string;
  tasks: RoadmapScoreTask[];
  goals: RoadmapScoreGoal[];
  milestones: RoadmapScoreMilestone[];
  updatedAt?: string;
}

export interface RoadmapScoreResult {
  score: number;
  label: 'Roadmap';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  scoreBreakdown: {
    completion: number;
    overdueControl: number;
    milestoneProgress: number;
    streak: number;
  };
  details: {
    empty: boolean;
    todayTotal: number;
    todayCompleted: number;
    activeTasks: number;
    completedTasks: number;
  };
}

function pktDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isInWindow(date: string | null, start: string, end: string): boolean {
  return date !== null && date >= start && date <= end;
}

function roundedPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateRoadmapScore(input: RoadmapScoreInput): RoadmapScoreResult {
  const windowStart = addDays(input.today, -(SCORE_WINDOW_DAYS - 1));
  const acceptedTasks = input.tasks.filter((task) => task.status !== 'suggested');
  const completedDays = new Set(
    acceptedTasks
      .flatMap((task) =>
        task.status === 'done' && task.completedAt ? [pktDate(task.completedAt)] : []
      )
  );
  const inWindowTasks = acceptedTasks.filter((task) => {
    const completedDate = task.completedAt ? pktDate(task.completedAt) : null;
    return isInWindow(task.dueDate, windowStart, input.today) ||
      isInWindow(completedDate, windowStart, input.today);
  });
  const completedInWindow = inWindowTasks.filter(
    (task) => task.status === 'done' &&
      task.completedAt !== null &&
      isInWindow(pktDate(task.completedAt), windowStart, input.today)
  ).length;
  const openTasks = acceptedTasks.filter((task) => task.status === 'todo');
  const overdueTasks = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate < input.today
  );

  const activeGoalIds = new Set(
    input.goals.filter((goal) => goal.status === 'active').map((goal) => goal.id)
  );
  const eligibleMilestones = input.milestones.filter(
    (milestone) =>
      activeGoalIds.has(milestone.goalId) &&
      (milestone.status === 'active' || milestone.status === 'done')
  );
  const completedMilestones = eligibleMilestones.filter(
    (milestone) => milestone.status === 'done'
  ).length;

  let streak = 0;
  let streakCursor = completedDays.has(input.today)
    ? input.today
    : completedDays.has(addDays(input.today, -1))
      ? addDays(input.today, -1)
      : '';
  while (streakCursor && completedDays.has(streakCursor)) {
    streak += 1;
    streakCursor = addDays(streakCursor, -1);
  }

  const empty = acceptedTasks.length === 0;
  const scoreBreakdown = empty
    ? { completion: 0, overdueControl: 0, milestoneProgress: 0, streak: 0 }
    : {
        completion: roundedPoints(
          inWindowTasks.length === 0 ? 0 : (50 * completedInWindow) / inWindowTasks.length
        ),
        overdueControl: roundedPoints(
          openTasks.length === 0
            ? 20
            : (20 * (openTasks.length - overdueTasks.length)) / openTasks.length
        ),
        milestoneProgress: roundedPoints(
          eligibleMilestones.length === 0
            ? 20
            : (20 * completedMilestones) / eligibleMilestones.length
        ),
        streak: roundedPoints((10 * Math.min(streak, SCORE_WINDOW_DAYS)) / SCORE_WINDOW_DAYS),
      };
  const score = empty
    ? 0
    : Math.round(
        scoreBreakdown.completion +
          scoreBreakdown.overdueControl +
          scoreBreakdown.milestoneProgress +
          scoreBreakdown.streak
      );
  const todayTotal = openTasks.filter(
    (task) => task.dueDate !== null && task.dueDate <= input.today
  ).length;
  const todayCompleted = acceptedTasks.filter(
    (task) => task.status === 'done' && task.dueDate === input.today
  ).length;
  const hasDueTasks = acceptedTasks.some(
    (task) =>
      (task.status === 'todo' || task.status === 'done') &&
      task.dueDate !== null &&
      task.dueDate <= input.today
  );

  return {
    score,
    label: 'Roadmap',
    streak,
    todayDone: hasDueTasks && todayTotal === 0,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    scoreBreakdown,
    details: {
      empty,
      todayTotal,
      todayCompleted,
      activeTasks: openTasks.length,
      completedTasks: acceptedTasks.filter((task) => task.status === 'done').length,
    },
  };
}

export async function computeRoadmapScore(userId: string): Promise<RoadmapScoreResult> {
  const [tasks, goals, milestones] = await Promise.all([
    db.select({
      status: roadmapTasks.status,
      dueDate: roadmapTasks.dueDate,
      completedAt: roadmapTasks.completedAt,
    }).from(roadmapTasks).where(and(
      eq(roadmapTasks.userId, userId),
      ne(roadmapTasks.status, 'suggested')
    )),
    db.select({
      id: roadmapGoals.id,
      status: roadmapGoals.status,
    }).from(roadmapGoals).where(eq(roadmapGoals.userId, userId)),
    db.select({
      goalId: roadmapMilestones.goalId,
      status: roadmapMilestones.status,
    }).from(roadmapMilestones).where(eq(roadmapMilestones.userId, userId)),
  ]);

  return calculateRoadmapScore({
    today: todayPKT(),
    tasks: tasks.map((task) => ({
      status: task.status as TaskStatus,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      status: goal.status as GoalStatus,
    })),
    milestones: milestones.map((milestone) => ({
      goalId: milestone.goalId,
      status: milestone.status as MilestoneStatus,
    })),
  });
}
