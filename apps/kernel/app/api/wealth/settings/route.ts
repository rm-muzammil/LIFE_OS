import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(wealthSettings)
    .where(eq(wealthSettings.userId, userId));
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const existing = await db
    .select({ key: wealthSettings.key })
    .from(wealthSettings)
    .where(and(eq(wealthSettings.userId, userId), eq(wealthSettings.key, body.key)));

  if (existing.length > 0) {
    const [row] = await db
      .update(wealthSettings)
      .set({ value: body.value, updatedAt: new Date() })
      .where(and(eq(wealthSettings.userId, userId), eq(wealthSettings.key, body.key)))
      .returning();
    return NextResponse.json(row);
  }

  const [row] = await db
    .insert(wealthSettings)
    .values({ userId, key: body.key, value: body.value })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
