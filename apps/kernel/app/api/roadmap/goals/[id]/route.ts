import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteGoal,
  getGoalDeleteCounts,
  getGoalDetail,
  isRecord,
  isUuid,
  updateGoal,
} from '@/lib/roadmap/repo';
import { parseGoalInput, validateDateRange } from '@/lib/roadmap/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const detail = await getGoalDetail(userId, params.id);
  if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getGoalDetail(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseGoalInput(body, true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const startDate = input.startDate === undefined ? existing.goal.startDate : input.startDate;
  const dueDate = input.dueDate === undefined ? existing.goal.dueDate : input.dueDate;
  const rangeError = validateDateRange(startDate, dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  const goal = await updateGoal(userId, params.id, input);
  return NextResponse.json({ goal });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getGoalDetail(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const counts = await getGoalDeleteCounts(userId, params.id);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!isRecord(body) || body.confirm !== true) {
    return NextResponse.json({ confirmRequired: true, counts });
  }
  await deleteGoal(userId, params.id);
  return NextResponse.json({ deleted: true, counts });
}
