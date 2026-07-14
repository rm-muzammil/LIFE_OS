import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const { weight, active, url, name } = body as {
      weight?: number;
      active?: boolean;
      url?: string;
      name?: string;
    };

    const updates: Record<string, unknown> = {};
    if (typeof weight === 'number') updates.weight = weight;
    if (typeof active === 'boolean') updates.active = active;
    if (typeof url === 'string') updates.url = url;
    if (typeof name === 'string') updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(provinces)
      .set(updates)
      .where(eq(provinces.slug, params.slug))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }

    return NextResponse.json({ province: { ...updated, apiKeyHash: undefined, pullSecret: undefined } });
  } catch (err) {
    console.error('provinces/[slug] PATCH error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const [deleted] = await db
      .delete(provinces)
      .where(eq(provinces.slug, params.slug))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('provinces/[slug] DELETE error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
