import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces, provinceDailySnapshots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { timingSafeEqualStrings } from '@/lib/auth';
import { todayPKT } from '@/lib/time';
import type { ProvinceReportPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const sharedKey = process.env.PROVINCE_SHARED_API_KEY;

    if (!sharedKey) {
      // Fail closed rather than silently accepting any key if this is unset.
      console.error('provinces/report: PROVINCE_SHARED_API_KEY is not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (!apiKey || !timingSafeEqualStrings(apiKey, sharedKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
    }

    const body = (await req.json()) as ProvinceReportPayload;
    if (
      typeof body.userId !== 'string' ||
      !body.userId ||
      typeof body.score !== 'number' ||
      typeof body.label !== 'string' ||
      typeof body.streak !== 'number' ||
      typeof body.todayDone !== 'boolean' ||
      typeof body.updatedAt !== 'string'
    ) {
      return NextResponse.json({ error: 'Malformed report payload' }, { status: 400 });
    }

    // One shared key authenticates every province app for every user now, so
    // the only thing scoping this push to the right person is the userId the
    // caller sends — the province app is trusted to send its own configured
    // userId correctly. See README for the tradeoff this introduces.
    const slug = body.label.toLowerCase().trim();
    const [province] = await db
      .select()
      .from(provinces)
      .where(and(eq(provinces.userId, body.userId), eq(provinces.slug, slug)));

    if (!province) {
      return NextResponse.json({ error: `Province '${slug}' not found for this user` }, { status: 404 });
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
      .values({ userId: body.userId, date, slug: province.slug, score: body.score, details })
      .onConflictDoUpdate({
        target: [provinceDailySnapshots.userId, provinceDailySnapshots.date, provinceDailySnapshots.slug],
        set: { score: body.score, details },
      });

    return NextResponse.json({ ok: true, slug: province.slug, cachedScore: body.score });
  } catch (err) {
    console.error('provinces/report error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
