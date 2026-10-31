import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { refreshWorkProvinceScore } from '@/lib/work/api';
import {
  deleteProject,
  isDateString,
  isProjectStatus,
  isRecord,
  isUuid,
  updateProject,
} from '@/lib/work/repo';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return NextResponse.json({ error: 'description must be a string or null' }, { status: 400 });
  }
  if (body.status !== undefined && !isProjectStatus(body.status)) {
    return NextResponse.json({ error: 'status must be active, paused, or completed' }, { status: 400 });
  }
  if (body.targetDate !== undefined && body.targetDate !== null && !isDateString(body.targetDate)) {
    return NextResponse.json({ error: 'targetDate must be a valid date or null' }, { status: 400 });
  }

  const input: Parameters<typeof updateProject>[2] = {};
  if (typeof body.name === 'string') input.name = body.name.trim();
  if (body.description === null || typeof body.description === 'string') {
    input.description = body.description;
  }
  if (isProjectStatus(body.status)) input.status = body.status;
  if (body.targetDate === null || isDateString(body.targetDate)) {
    input.targetDate = body.targetDate;
  }

  const project = await updateProject(userId, params.id, input);
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await refreshWorkProvinceScore(userId);
  return NextResponse.json({ project });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const deleted = await deleteProject(userId, params.id);
  if (!deleted) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await refreshWorkProvinceScore(userId);
  return NextResponse.json({ ok: true });
}
