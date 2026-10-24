import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthDebts } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db
    .delete(wealthDebts)
    .where(and(eq(wealthDebts.userId, userId), eq(wealthDebts.id, params.id)));
  return NextResponse.json({ ok: true });
}
