// GET /api/provinces — all provinces with cached state

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces } from '@/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({
      id:           provinces.id,
      name:         provinces.name,
      slug:         provinces.slug,
      url:          provinces.url,
      weight:       provinces.weight,
      active:       provinces.active,
      cachedScore:  provinces.cachedScore,
      cachedDetails: provinces.cachedDetails,
      cachedAt:     provinces.cachedAt,
      lastPushedAt: provinces.lastPushedAt,
    })
    .from(provinces)
    .orderBy(asc(provinces.createdAt))

  return NextResponse.json(rows)
}