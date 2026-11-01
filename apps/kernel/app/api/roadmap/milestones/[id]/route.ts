import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteMilestone,
  getMilestone,
  getMilestoneDeleteCounts,
  getGoal,
  isRecord,
  isUuid,
  updateMilestone,
} from '@/lib/roadmap/repo';
import { parseMilestoneInput, validateDateRange } from '@/lib/roadmap/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getMilestone(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseMilestoneInput(body, true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  if (input.goalId !== undefined && input.goalId !== existing.goalId) {
    return NextResponse.json({ error: 'goalId cannot be changed after milestone creation' }, { status: 400 });
  }
  const startDate = input.startDate === undefined ? existing.startDate : input.startDate;
  const dueDate = input.dueDate === undefined ? existing.dueDate : input.dueDate;
  const rangeError = validateDateRange(startDate, dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  if (input.goalId !== undefined && !(await getGoal(userId, input.goalId))) {
    return NextResponse.json({ error: 'goal not found' }, { status: 404 });
  }
  const milestone = await updateMilestone(userId, params.id, input);
  return NextResponse.json({ milestone });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getMilestone(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const counts = await getMilestoneDeleteCounts(userId, params.id);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!isRecord(body) || body.confirm !== true) {
    return NextResponse.json({ confirmRequired: true, counts });
  }
  await deleteMilestone(userId, params.id);
  return NextResponse.json({ deleted: true, counts });
}
