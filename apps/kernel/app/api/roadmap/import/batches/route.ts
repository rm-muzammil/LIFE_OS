import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { listImportBatches } from '@/lib/roadmap/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ batches: await listImportBatches(userId) });
}
