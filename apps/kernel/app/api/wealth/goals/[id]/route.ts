import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthGoals } from '@/db/schema';
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
    .update(wealthGoals)
    .set({ status: body.status })
    .where(and(eq(wealthGoals.userId, userId), eq(wealthGoals.id, params.id)))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db
    .delete(wealthGoals)
    .where(and(eq(wealthGoals.userId, userId), eq(wealthGoals.id, params.id)));
  return NextResponse.json({ ok: true });
}
