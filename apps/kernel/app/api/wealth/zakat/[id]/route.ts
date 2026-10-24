import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthZakatAssets } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .update(wealthZakatAssets)
    .set({
      paid: body.paid,
      paidDate: body.paid ? new Date().toISOString() : null,
    })
    .where(and(eq(wealthZakatAssets.userId, userId), eq(wealthZakatAssets.id, params.id)))
    .returning();
  return NextResponse.json(row);
}
