import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { refreshWorkProvinceScore } from '@/lib/work/api';
import {
  createProject,
  isDateString,
  isProjectStatus,
  isRecord,
  listProjects,
} from '@/lib/work/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await listProjects(userId);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
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

  const project = await createProject(userId, {
    name: body.name.trim(),
    description: typeof body.description === 'string' ? body.description : null,
    status: isProjectStatus(body.status) ? body.status : 'active',
    targetDate: isDateString(body.targetDate) ? body.targetDate : null,
  });
  await refreshWorkProvinceScore(userId);
  return NextResponse.json({ project }, { status: 201 });
}
