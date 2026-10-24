import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthDebts } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(wealthDebts)
    .where(eq(wealthDebts.userId, userId))
    .orderBy(desc(wealthDebts.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(wealthDebts)
    .values({
      userId,
      lender: body.lender,
      totalAmount: body.totalAmount,
      payoffDeadline: body.payoffDeadline ?? null,
      monthlyCommitment: body.monthlyCommitment ?? 0,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
