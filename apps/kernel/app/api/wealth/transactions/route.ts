import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthTransactions } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(wealthTransactions)
    .where(eq(wealthTransactions.userId, userId))
    .orderBy(desc(wealthTransactions.date));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(wealthTransactions)
    .values({
      userId,
      date: body.date,
      type: body.type,
      amount: body.amount,
      category: body.category,
      subTag: body.subTag,
      halalVerified: body.halalVerified ?? false,
      recurring: body.recurring ?? false,
      linkedGoalId: body.linkedGoalId ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
