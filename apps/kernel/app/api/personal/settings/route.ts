import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { refreshPersonalProvinceScore } from '@/lib/personal/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [settings] = await db
    .select({
      geminiKey1: userSettings.geminiKey1,
      geminiKey2: userSettings.geminiKey2,
      geminiKey3: userSettings.geminiKey3,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  const hasGeminiKey = Boolean(
    settings?.geminiKey1 || settings?.geminiKey2 || settings?.geminiKey3
  );
  return NextResponse.json({ hasGeminiKey });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { geminiApiKey?: unknown };
  if (typeof body.geminiApiKey !== 'string' || body.geminiApiKey.trim().length === 0) {
    return NextResponse.json({ error: 'geminiApiKey is required' }, { status: 400 });
  }

  await db
    .insert(userSettings)
    .values({ userId, geminiKey1: body.geminiApiKey.trim() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { geminiKey1: body.geminiApiKey.trim(), updatedAt: new Date() },
    });

  await refreshPersonalProvinceScore(userId);
  return NextResponse.json({ ok: true });
}
