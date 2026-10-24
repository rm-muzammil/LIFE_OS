import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wealthZakatAssets } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(wealthZakatAssets)
    .where(eq(wealthZakatAssets.userId, userId));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const [row] = await db
    .insert(wealthZakatAssets)
    .values({
      userId,
      assetName: body.assetName,
      currentValue: body.currentValue,
      zakatEligible: body.zakatEligible ?? true,
      nisabThreshold: body.nisabThreshold ?? 0,
      hawlStartDate: body.hawlStartDate,
      paid: false,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
