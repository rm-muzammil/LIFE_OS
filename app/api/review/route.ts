import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { weeklyReview, characterRatings } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/review?week=2025-W23   → review + character for that week
// GET /api/review?limit=20        → list of past reviews (newest first)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const week  = searchParams.get('week')
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  if (week) {
    const [review] = await db
      .select()
      .from(weeklyReview)
      .where(eq(weeklyReview.isoWeek, week))
      .limit(1)

    const [character] = await db
      .select()
      .from(characterRatings)
      .where(eq(characterRatings.isoWeek, week))
      .limit(1)

    return NextResponse.json({ review: review ?? null, character: character ?? null })
  }

  const rows = await db
    .select({
      id:      weeklyReview.id,
      isoWeek: weeklyReview.isoWeek,
      missionAlignScore: weeklyReview.missionAlignScore,
      createdAt: weeklyReview.createdAt,
    })
    .from(weeklyReview)
    .orderBy(desc(weeklyReview.isoWeek))
    .limit(limit)

  return NextResponse.json(rows)
}

// POST /api/review  — upsert
export async function POST(req: NextRequest) {
  const {
    isoWeek, wentWell, wentWrong, distractions,
    mustImprove, intentions, missionAlignScore, missionAlignNote,
  } = await req.json()

  if (!isoWeek) return NextResponse.json({ error: 'isoWeek required' }, { status: 400 })
  if (typeof missionAlignScore !== 'number' || missionAlignScore < 1 || missionAlignScore > 5)
    return NextResponse.json({ error: 'missionAlignScore must be 1–5' }, { status: 400 })

  const payload = {
    wentWell:          wentWell          ?? '',
    wentWrong:         wentWrong         ?? '',
    distractions:      distractions      ?? '',
    mustImprove:       mustImprove       ?? '',
    intentions:        intentions        ?? '',
    missionAlignScore,
    missionAlignNote:  missionAlignNote  ?? '',
    updatedAt: new Date(),
  }

  const [existing] = await db
    .select({ id: weeklyReview.id })
    .from(weeklyReview)
    .where(eq(weeklyReview.isoWeek, isoWeek))
    .limit(1)

  if (existing) {
    const [row] = await db
      .update(weeklyReview)
      .set(payload)
      .where(eq(weeklyReview.isoWeek, isoWeek))
      .returning()
    return NextResponse.json(row)
  }

  const [row] = await db
    .insert(weeklyReview)
    .values({ isoWeek, ...payload })
    .returning()
  return NextResponse.json(row, { status: 201 })
}