import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { personalDailyLogs } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const logs = await db
    .select()
    .from(personalDailyLogs)
    .where(eq(personalDailyLogs.userId, userId))
    .orderBy(desc(personalDailyLogs.date))
    .limit(90);
  return NextResponse.json(logs);
}
