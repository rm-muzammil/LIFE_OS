// GET /api/cron/pull-provinces
// Daily cron — polls all active provinces. Skips silently on failure (carry forward).

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const active = await db
    .select()
    .from(provinces)
    .where(eq(provinces.active, true))

  const results: { slug: string; ok: boolean; error?: string }[] = []

  await Promise.allSettled(
    active.map(async (p) => {
      try {
        const res = await fetch(`${p.url}/api/report`, {
          headers: { Authorization: `Bearer ${p.pullSecret}` },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        await db
          .update(provinces)
          .set({
            cachedScore:   data.score  ?? p.cachedScore,
            cachedDetails: data,
            cachedAt:      new Date(),
            lastPulledAt:  new Date(),
          })
          .where(eq(provinces.id, p.id))

        results.push({ slug: p.slug, ok: true })
      } catch (err: any) {
        results.push({ slug: p.slug, ok: false, error: err.message })
      }
    })
  )

  return NextResponse.json({ pulled: results.length, results })
}