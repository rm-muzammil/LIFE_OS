import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { getOverview } from '@/lib/roadmap/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getOverview(userId));
}
