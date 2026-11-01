import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  createMilestone,
  getGoal,
  isRecord,
  isUuid,
  listMilestones,
} from '@/lib/roadmap/repo';
import { parseMilestoneInput, validateDateRange } from '@/lib/roadmap/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const goalId = request.nextUrl.searchParams.get('goalId') ?? undefined;
  if (goalId && !isUuid(goalId)) return NextResponse.json({ error: 'invalid goalId' }, { status: 400 });
  if (goalId && !(await getGoal(userId, goalId))) {
    return NextResponse.json({ error: 'goal not found' }, { status: 404 });
  }
  return NextResponse.json({ milestones: await listMilestones(userId, goalId) });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseMilestoneInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const goalId = input.goalId!;
  if (!(await getGoal(userId, goalId))) return NextResponse.json({ error: 'goal not found' }, { status: 404 });
  const rangeError = validateDateRange(input.startDate, input.dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  const milestone = await createMilestone(userId, {
    goalId,
    title: input.title!,
    description: input.description ?? null,
    domain: input.domain ?? 'other',
    priority: input.priority ?? 'medium',
    status: input.status ?? 'active',
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
  });
  return NextResponse.json({ milestone }, { status: 201 });
}
