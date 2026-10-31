import { and, eq, like } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faithSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { isRecord } from '@/lib/faith/validation';
import { setFaithSetting } from '@/lib/faith/settings';

export const dynamic = 'force-dynamic';

function isClientWritableSetting(key: string): boolean {
  return (
    key === 'current_verse_index' ||
    key === 'hijri_adjustment' ||
    /^hijri_override_\d{4}-\d{2}-\d{2}$/.test(key)
  );
}

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = req.nextUrl.searchParams.get('key');
  const prefix = req.nextUrl.searchParams.get('prefix');
  const rows = await db
    .select({ key: faithSettings.key, value: faithSettings.value })
    .from(faithSettings)
    .where(
      key
        ? and(eq(faithSettings.userId, userId), eq(faithSettings.key, key))
        : prefix
          ? and(eq(faithSettings.userId, userId), like(faithSettings.key, `${prefix}%`))
          : eq(faithSettings.userId, userId)
    );
  if (key) return NextResponse.json({ [key]: rows[0]?.value ?? null });
  return NextResponse.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid settings object is required' }, { status: 400 });
  }
  const entries = Object.entries(body);
  if (entries.length === 0) {
    return NextResponse.json({ error: 'At least one setting is required' }, { status: 400 });
  }
  const updates: Array<[string, string]> = [];
  for (const [key, value] of entries) {
    if (!isClientWritableSetting(key) || typeof value !== 'string') {
      return NextResponse.json({ error: 'One or more settings are not writable' }, { status: 400 });
    }
    updates.push([key, value]);
  }

  for (const [key, value] of updates) {
    await setFaithSetting(userId, key, value);
  }
  return NextResponse.json({ ok: true });
}
