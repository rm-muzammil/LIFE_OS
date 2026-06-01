import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characterRatings } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/character?weeks=8     → last N weeks, chronological
// GET /api/character?week=2025-W23 → single week or null
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week  = searchParams.get('week')
  const weeks = parseInt(searchParams.get('weeks') ?? '8', 10)

  if (week) {
    const [row] = await db
      .select()
      .from(characterRatings)
      .where(eq(characterRatings.isoWeek, week))
      .limit(1)
    return NextResponse.json(row ?? null)
  }

  const rows = await db
    .select()
    .from(characterRatings)
    .orderBy(desc(characterRatings.isoWeek))
    .limit(weeks)

  return NextResponse.json(rows.reverse())  // chronological for charts
}

// POST /api/character  — upsert
export async function POST(req: NextRequest) {
  const { isoWeek, patience, discipline, gratitude, humility, truthfulness } = await req.json()

  if (!isoWeek) return NextResponse.json({ error: 'isoWeek required' }, { status: 400 })

  for (const [k, v] of Object.entries({ patience, discipline, gratitude, humility, truthfulness })) {
    if (typeof v !== 'number' || v < 1 || v > 5)
      return NextResponse.json({ error: `${k} must be 1–5` }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: characterRatings.id })
    .from(characterRatings)
    .where(eq(characterRatings.isoWeek, isoWeek))
    .limit(1)

  if (existing) {
    const [row] = await db
      .update(characterRatings)
      .set({ patience, discipline, gratitude, humility, truthfulness, updatedAt: new Date() })
      .where(eq(characterRatings.isoWeek, isoWeek))
      .returning()
    return NextResponse.json(row)
  }

  const [row] = await db
    .insert(characterRatings)
    .values({ isoWeek, patience, discipline, gratitude, humility, truthfulness })
    .returning()
  return NextResponse.json(row, { status: 201 })
}