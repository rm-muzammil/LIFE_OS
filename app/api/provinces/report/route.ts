// POST /api/provinces/report
// Called by province apps on every save. Verifies API key, updates cache.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const rawKey = req.headers.get('x-api-key')
  if (!rawKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { score, label, streak, todayDone, updatedAt, details } = body

  // Find province by slug from label, or scan all active ones to match key
  const all = await db.select().from(provinces).where(eq(provinces.active, true))

  let matched: typeof all[0] | null = null
  for (const p of all) {
    const ok = await bcrypt.compare(rawKey, p.apiKeyHash)
    if (ok) { matched = p; break }
  }

  if (!matched) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 })

  await db
    .update(provinces)
    .set({
      cachedScore:   score ?? matched.cachedScore,
      cachedDetails: { score, label, streak, todayDone, updatedAt, details },
      cachedAt:      new Date(),
      lastPushedAt:  new Date(),
    })
    .where(eq(provinces.id, matched.id))

  return NextResponse.json({ ok: true })
}