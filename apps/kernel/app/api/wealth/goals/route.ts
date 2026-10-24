import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthGoals } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(wealthGoals)
    .where(eq(wealthGoals.userId, userId))
    .orderBy(desc(wealthGoals.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(wealthGoals)
    .values({
      userId,
      name: body.name,
      targetAmount: body.targetAmount,
      deadline: body.deadline,
      priority: body.priority,
      status: body.status ?? 'Active',
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
