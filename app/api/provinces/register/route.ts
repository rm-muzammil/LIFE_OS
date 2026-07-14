import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces } from '@/db/schema';
import { generateRawKey, generatePullSecret, hashApiKey } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, url, weight } = body as {
      name?: string;
      slug?: string;
      url?: string;
      weight?: number;
    };

    if (!name || !slug || !url || typeof weight !== 'number') {
      return NextResponse.json(
        { error: 'name, slug, url, and weight are required' },
        { status: 400 }
      );
    }

    const rawApiKey = generateRawKey(slug);
    const pullSecret = generatePullSecret();
    const apiKeyHash = await hashApiKey(rawApiKey);

    const [created] = await db
      .insert(provinces)
      .values({
        name,
        slug: slug.toLowerCase().trim(),
        url,
        weight,
        apiKeyHash,
        pullSecret,
      })
      .returning();

    // Raw apiKey + pullSecret are returned ONLY here, once. Never stored in plaintext (apiKey).
    return NextResponse.json({
      province: { ...created, apiKeyHash: undefined },
      rawApiKey,
      pullSecret,
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'A province with that slug already exists' }, { status: 409 });
    }
    console.error('provinces/register error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
