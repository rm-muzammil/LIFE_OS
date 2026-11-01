import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import {
  deleteBatch,
  getBatchDeleteCounts,
  getImportBatch,
  isRecord,
  isUuid,
} from '@/lib/roadmap/repo';
import { refreshRoadmapProvinceScore } from '@/lib/roadmap/api';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(params.id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const batch = await getImportBatch(userId, params.id);
  if (!batch) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (
    batch.status === 'pending' &&
    batch.confirmStartedAt !== null &&
    Date.now() - batch.confirmStartedAt.getTime() < 10 * 60 * 1000
  ) {
    return NextResponse.json({ error: 'Cannot delete a batch while its import is running' }, { status: 409 });
  }
  const counts = await getBatchDeleteCounts(userId, params.id);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!isRecord(body) || body.confirm !== true) {
    return NextResponse.json({ confirmRequired: true, counts });
  }
  const deleted = await deleteBatch(userId, params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Cannot delete a batch while its import is running' }, { status: 409 });
  }
  await refreshRoadmapProvinceScore(userId);
  return NextResponse.json({ deleted: true, counts });
}
