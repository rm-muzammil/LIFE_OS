import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { createCommitment, listCommitments } from '@/lib/planner/repo';
import {
  parseCommitmentInput,
  validateCommitment,
  type CommitmentInput,
} from '@/lib/planner/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ commitments: await listCommitments(userId) });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseCommitmentInput(await request.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value as CommitmentInput;
  const error = validateCommitment(input);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const commitment = await createCommitment(userId, input);
  return NextResponse.json({ commitment }, { status: 201 });
}
