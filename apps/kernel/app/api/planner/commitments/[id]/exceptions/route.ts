import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  cancelCommitmentDate,
  getCommitment,
  restoreCommitmentDate,
} from '@/lib/planner/repo';
import { isPlannerDate, weekdayForDate } from '@/lib/planner/time';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readDate(request: NextRequest): Promise<string | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const date = (body as Record<string, unknown>).date;
  return isPlannerDate(date) ? date : null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const commitment = await getCommitment(userId, params.id);
  if (!commitment) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const date = await readDate(request);
  if (!date) return NextResponse.json({ error: 'date must be a valid YYYY-MM-DD date' }, { status: 400 });
  const occursOnDate = commitment.date
    ? commitment.date === date
    : commitment.weekday === weekdayForDate(date);
  const inRange =
    (!commitment.validFrom || date >= commitment.validFrom) &&
    (!commitment.validTo || date <= commitment.validTo);
  if (!occursOnDate || !inRange) {
    return NextResponse.json({ error: 'The commitment does not occur on that date' }, { status: 400 });
  }
  await cancelCommitmentDate(userId, params.id, date);
  return NextResponse.json({ cancelled: true, date });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const commitment = await getCommitment(userId, params.id);
  if (!commitment) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const date = await readDate(request);
  if (!date) return NextResponse.json({ error: 'date must be a valid YYYY-MM-DD date' }, { status: 400 });
  const restored = await restoreCommitmentDate(userId, params.id, date);
  return NextResponse.json({ restored: Boolean(restored), date });
}
