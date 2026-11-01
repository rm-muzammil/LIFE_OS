import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { faithDailyLogs, faithSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { generateDailyGuidance } from '@/lib/faith/guidance';
import { getHijriDate } from '@/lib/faith/hijri';
import { getUserGeminiKeys } from '@/lib/gemini';
import { refreshFaithProvinceScore } from '@/lib/faith/refresh';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settingsRows = await db
    .select({ key: faithSettings.key, value: faithSettings.value })
    .from(faithSettings)
    .where(eq(faithSettings.userId, userId));
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const today = new Date().toISOString().slice(0, 10);
  if (settings.daily_guidance_date === today && settings.daily_guidance) {
    try {
      return NextResponse.json(JSON.parse(settings.daily_guidance) as unknown);
    } catch {
      console.warn('Faith guidance cache is invalid; regenerating it.');
    }
  }

  const recentLogs = await db
    .select()
    .from(faithDailyLogs)
    .where(eq(faithDailyLogs.userId, userId))
    .orderBy(desc(faithDailyLogs.date))
    .limit(7);
  const hijri = await getHijriDate(new Date(), settings);
  const guidance = await generateDailyGuidance(
    recentLogs,
    hijri,
    await getUserGeminiKeys(userId)
  );
  if (!guidance) {
    console.error('Faith guidance generation failed.');
    return NextResponse.json({ error: 'generation_failed' }, { status: 503 });
  }

  const now = new Date();
  await db
    .insert(faithSettings)
    .values({
      userId,
      key: 'daily_guidance',
      value: JSON.stringify(guidance),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [faithSettings.userId, faithSettings.key],
      set: { value: JSON.stringify(guidance), updatedAt: now },
    });
  await db
    .insert(faithSettings)
    .values({ userId, key: 'daily_guidance_date', value: today, updatedAt: now })
    .onConflictDoUpdate({
      target: [faithSettings.userId, faithSettings.key],
      set: { value: today, updatedAt: now },
    });
  return NextResponse.json(guidance);
}

export async function DELETE() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  await db
    .insert(faithSettings)
    .values({ userId, key: 'daily_guidance_date', value: '', updatedAt: now })
    .onConflictDoUpdate({
      target: [faithSettings.userId, faithSettings.key],
      set: { value: '', updatedAt: now },
    });
  await refreshFaithProvinceScore(userId);
  return NextResponse.json({ ok: true });
}
