import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  isRoadmapDomain,
  isTaskStatus,
  isRecord,
  listTasks,
  resolveTaskParentIds,
  createTask,
} from '@/lib/roadmap/repo';
import { parseTaskInput, validateDateRange } from '@/lib/roadmap/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const domain = params.get('domain');
  const status = params.get('status');
  const due = params.get('due');
  const domainFilter = domain === null ? undefined : isRoadmapDomain(domain) ? domain : null;
  const statusFilter = status === null ? undefined : isTaskStatus(status) ? status : null;
  const dueFilter = due === null
    ? undefined
    : due === 'today' || due === 'overdue' || due === 'upcoming'
      ? due
      : null;
  if (domainFilter === null) {
    return NextResponse.json({ error: 'invalid domain filter' }, { status: 400 });
  }
  if (statusFilter === null) {
    return NextResponse.json({ error: 'invalid status filter' }, { status: 400 });
  }
  if (dueFilter === null) {
    return NextResponse.json({ error: 'due must be today, overdue, or upcoming' }, { status: 400 });
  }
  const tasks = await listTasks(userId, {
    ...(domainFilter ? { domain: domainFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dueFilter ? { due: dueFilter } : {}),
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  const parsed = parseTaskInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;
  const rangeError = validateDateRange(input.startDate, input.dueDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  const parents = await resolveTaskParentIds(
    userId,
    input.goalId ?? null,
    input.milestoneId ?? null
  );
  if (!parents) {
    return NextResponse.json({
      error: 'goalId and milestoneId must belong to this user and refer to the same goal',
    }, { status: 400 });
  }
  const task = await createTask(userId, {
    ...input,
    goalId: parents.goalId,
    milestoneId: parents.milestoneId,
    title: input.title!,
    description: input.description ?? null,
    domain: input.domain ?? 'other',
    priority: input.priority ?? 'medium',
    status: input.status ?? 'todo',
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    estimateMinutes: input.estimateMinutes ?? null,
  });
  return NextResponse.json({ task }, { status: 201 });
}
