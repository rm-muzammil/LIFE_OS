import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyApiKey } from '@/lib/auth';
import { todayPKT } from '@/lib/time';
import type { ProvinceReportPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-Api-Key header' }, { status: 401 });
    }

    const body = (await req.json()) as ProvinceReportPayload;
    if (
      typeof body.score !== 'number' ||
      typeof body.label !== 'string' ||
      typeof body.streak !== 'number' ||
      typeof body.todayDone !== 'boolean' ||
      typeof body.updatedAt !== 'string'
    ) {
      return NextResponse.json({ error: 'Malformed report payload' }, { status: 400 });
    }

    // Find province by label -> slug match (case-insensitive) since push doesn't include slug
    const slug = body.label.toLowerCase().trim();
    const [province] = await db.select().from(provinces).where(eq(provinces.slug, slug));

    if (!province) {
      return NextResponse.json({ error: `Unknown province slug '${slug}'` }, { status: 404 });
    }

    const valid = await verifyApiKey(apiKey, province.apiKeyHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const now = new Date();
    const details = {
      ...(body.details ?? {}),
      streak: body.streak,
      todayDone: body.todayDone,
    };

    await db
      .update(provinces)
      .set({
        cachedScore: body.score,
        cachedDetails: details,
        cachedAt: now,
        lastPushedAt: now,
      })
      .where(eq(provinces.id, province.id));

    // Upsert today's snapshot (PKT date)
    const date = todayPKT();
    await db
      .insert(provinceDailySnapshots)
      .values({ date, slug: province.slug, score: body.score, details })
      .onConflictDoUpdate({
        target: [provinceDailySnapshots.date, provinceDailySnapshots.slug],
        set: { score: body.score, details },
      });

    return NextResponse.json({ ok: true, slug: province.slug, cachedScore: body.score });
  } catch (err) {
    console.error('provinces/report error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
