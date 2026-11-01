import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { createGoal, isRecord, listGoals } from '@/lib/roadmap/repo';
import { parseGoalInput, validateDateRange } from '@/lib/roadmap/validation';
import { refreshRoadmapProvinceScore } from '@/lib/roadmap/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ goals: await listGoals(userId) });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseGoalInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const rangeError = validateDateRange(input.startDate, input.dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  const goal = await createGoal(userId, {
    title: input.title!,
    description: input.description ?? null,
    domain: input.domain ?? 'other',
    priority: input.priority ?? 'medium',
    status: input.status ?? 'active',
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
  });
  await refreshRoadmapProvinceScore(userId);
  return NextResponse.json({ goal }, { status: 201 });
}
