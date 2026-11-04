import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteCommitment,
  getCommitment,
  updateCommitment,
} from '@/lib/planner/repo';
import {
  parseCommitmentInput,
  validateCommitment,
  type CommitmentInput,
} from '@/lib/planner/validation';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const existing = await getCommitment(userId, params.id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const parsed = parseCommitmentInput(await request.json(), true);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input: CommitmentInput = {
    title: existing.title,
    kind: existing.kind as CommitmentInput['kind'],
    weekday: existing.weekday,
    date: existing.date,
    startTime: existing.startTime,
    endTime: existing.endTime,
    validFrom: existing.validFrom,
    validTo: existing.validTo,
    location: existing.location,
    notes: existing.notes,
    active: existing.active,
    ...parsed.value,
  };
  const error = validateCommitment(input);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const commitment = await updateCommitment(userId, params.id, parsed.value);
  return NextResponse.json({ commitment });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const deleted = await deleteCommitment(userId, params.id);
  if (!deleted) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
