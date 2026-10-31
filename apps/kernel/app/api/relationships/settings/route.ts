import { and, eq, like } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { relationshipsSettings } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { refreshRelationshipsProvinceScore } from '@/lib/relationships/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = req.nextUrl.searchParams.get('key');
  const prefix = req.nextUrl.searchParams.get('prefix');
  if (key) {
    const [row] = await db
      .select({ value: relationshipsSettings.value })
      .from(relationshipsSettings)
      .where(and(eq(relationshipsSettings.userId, userId), eq(relationshipsSettings.key, key)))
      .limit(1);
    return NextResponse.json({ key, value: row?.value ?? null });
  }

  const rows = await db
    .select({
      key: relationshipsSettings.key,
      value: relationshipsSettings.value,
      updatedAt: relationshipsSettings.updatedAt,
    })
    .from(relationshipsSettings)
    .where(
      prefix
        ? and(eq(relationshipsSettings.userId, userId), like(relationshipsSettings.key, `${prefix}%`))
        : eq(relationshipsSettings.userId, userId)
    );
  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  if (typeof payload.key !== 'string' || payload.key.length === 0) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  if (payload.value !== undefined && typeof payload.value !== 'string') {
    return NextResponse.json({ error: 'value must be a string' }, { status: 400 });
  }
  const value = typeof payload.value === 'string' ? payload.value : '';
  await db
    .insert(relationshipsSettings)
    .values({ userId, key: payload.key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [relationshipsSettings.userId, relationshipsSettings.key],
      set: { value, updatedAt: new Date() },
    });

  await refreshRelationshipsProvinceScore(userId);
  return NextResponse.json({ ok: true });
}
