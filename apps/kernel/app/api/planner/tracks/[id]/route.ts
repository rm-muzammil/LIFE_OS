import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteTrack,
  getTrack,
  hasPlannerGoal,
  updateTrack,
} from '@/lib/planner/repo';
import { parseTrackInput, validateTrack, type TrackInput } from '@/lib/planner/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getTrack(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const parsed = parseTrackInput(await request.json(), true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input: TrackInput = {
    title: existing.title,
    domain: existing.domain as TrackInput['domain'],
    weeklyTargetMinutes: existing.weeklyTargetMinutes,
    minSessionMinutes: existing.minSessionMinutes,
    maxSessionMinutes: existing.maxSessionMinutes,
    maxPerDayMinutes: existing.maxPerDayMinutes,
    preferredWindow: existing.preferredWindow as TrackInput['preferredWindow'],
    allowedWeekdays: existing.allowedWeekdays,
    priority: existing.priority as TrackInput['priority'],
    active: existing.active,
    goalId: existing.goalId,
    ...parsed.value,
  };
  const error = validateTrack(input);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (input.goalId && !(await hasPlannerGoal(userId, input.goalId))) {
    return NextResponse.json({ error: 'goalId must refer to a goal belonging to this user' }, { status: 400 });
  }
  const track = await updateTrack(userId, params.id, parsed.value);
  return NextResponse.json({ track });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const deleted = await deleteTrack(userId, params.id);
  if (!deleted) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
