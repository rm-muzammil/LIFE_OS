import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { computeRelationshipsScore } from '@/lib/relationships/score';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const report = await computeRelationshipsScore(userId);
  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}
