import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteTask,
  getTask,
  isRecord,
  isUuid,
  resolveTaskParentIds,
  updateTask,
} from '@/lib/roadmap/repo';
import { parseTaskInput, validateDateRange } from '@/lib/roadmap/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getTask(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseTaskInput(body, true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const startDate = input.startDate === undefined ? existing.startDate : input.startDate;
  const dueDate = input.dueDate === undefined ? existing.dueDate : input.dueDate;
  const rangeError = validateDateRange(startDate, dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const hasGoal = input.goalId !== undefined;
  const hasMilestone = input.milestoneId !== undefined;
  if (hasGoal && input.goalId === null && !hasMilestone && existing.milestoneId) {
    return NextResponse.json({
      error: 'A task assigned to a milestone must retain its milestone goal',
    }, { status: 400 });
  }
  const nextMilestoneId = hasMilestone ? input.milestoneId! : existing.milestoneId;
  const nextGoalId = hasMilestone && input.milestoneId !== null && !hasGoal
    ? null
    : hasGoal
      ? input.goalId!
      : existing.goalId;
  const parents = hasGoal || hasMilestone
    ? await resolveTaskParentIds(userId, nextGoalId, nextMilestoneId)
    : { goalId: existing.goalId, milestoneId: existing.milestoneId };
  if (!parents) {
    return NextResponse.json({
      error: 'goalId and milestoneId must belong to this user and refer to the same goal',
    }, { status: 400 });
  }
  const task = await updateTask(userId, params.id, {
    ...input,
    ...(hasGoal || hasMilestone
      ? { goalId: parents.goalId, milestoneId: parents.milestoneId }
      : {}),
  });
  return NextResponse.json({ task });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const deleted = await deleteTask(userId, params.id);
  if (!deleted) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
