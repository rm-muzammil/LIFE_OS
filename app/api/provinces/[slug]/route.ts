// PATCH /api/provinces/[slug] — update weight, active, url

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await req.json()
  const allowed: Record<string, unknown> = {}

  if (body.weight   != null)  allowed.weight = Number(body.weight)
  if (body.active   != null)  allowed.active = Boolean(body.active)
  if (body.url      != null)  allowed.url    = String(body.url)

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(provinces)
    .set(allowed)
    .where(eq(provinces.slug, params.slug))
    .returning({ id: provinces.id, slug: provinces.slug })

  if (!updated) return NextResponse.json({ error: 'Province not found' }, { status: 404 })

  return NextResponse.json({ ok: true, slug: updated.slug })
}