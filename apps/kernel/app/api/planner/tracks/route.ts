import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { createTrack, hasPlannerGoal, listTracks } from '@/lib/planner/repo';
import { parseTrackInput, validateTrack, type TrackInput } from '@/lib/planner/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ tracks: await listTracks(userId) });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseTrackInput(await request.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value as TrackInput;
  const error = validateTrack(input);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (input.goalId && !(await hasPlannerGoal(userId, input.goalId))) {
    return NextResponse.json({ error: 'goalId must refer to a goal belonging to this user' }, { status: 400 });
  }
  const track = await createTrack(userId, input);
  return NextResponse.json({ track }, { status: 201 });
}
