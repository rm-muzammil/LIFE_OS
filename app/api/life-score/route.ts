import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces, characterRatings, weeklyReview, lifeScoreHistory } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

// Base weights — normalised at compute time so they always sum to 1.0,
// even if a province is inactive/missing or DB weights drift.
const BASE_WEIGHTS: Record<string, number> = {
  faith: 0.30,
  personal: 0.20,
  wealth: 0.15,
  roadmap: 0.15,
  relationships: 0.10,
  work: 0.10,
  character: 0.10, // internal
  mission: 0.05,   // internal
}

function todayPKT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

async function getCharacterScore(): Promise<number | null> {
  const rows = await db
    .select()
    .from(characterRatings)
    .orderBy(desc(characterRatings.createdAt))
    .limit(30) // recent window — adjust if you score on a different cadence

  if (!rows.length) return null

  // Average all numeric rating fields on the row (excludes id/date/notes-type columns).
  const numericKeys = Object.keys(rows[0]).filter(
    (k) => typeof (rows[0] as any)[k] === 'number' && k !== 'id'
  )
  if (!numericKeys.length) return null

  const perRowAvg = rows.map((r) => {
    const vals = numericKeys.map((k) => (r as any)[k] as number)
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })
  const overall = perRowAvg.reduce((a, b) => a + b, 0) / perRowAvg.length

  // Scale 0–100. Assumes ratings are on a 0–10 scale; adjust the divisor if not.
  return Math.max(0, Math.min(100, overall * 10))
}

async function getMissionScore(): Promise<number | null> {
  const [latest] = await db
    .select()
    .from(weeklyReview)
    .orderBy(desc(weeklyReview.createdAt))
    .limit(1)

  if (!latest || latest.missionAlignScore == null) return null

  // Assumes missionAlignScore is 0–10; scale to 0–100. Adjust if already 0–100.
  const raw = latest.missionAlignScore as unknown as number
  const scaled = raw <= 10 ? raw * 10 : raw
  return Math.max(0, Math.min(100, scaled))
}

async function getCarryForwardScore(slug: string): Promise<number | null> {
  const [last] = await db
    .select()
    .from(lifeScoreHistory)
    .where(eq(lifeScoreHistory.slug, slug))
    .orderBy(desc(lifeScoreHistory.date))
    .limit(1)

  return last?.score ?? null
}

export async function GET() {
  const activeProvinces = await db
    .select()
    .from(provinces)
    .where(eq(provinces.active, true))

  const components: {
    slug: string
    score: number | null
    weight: number
    stale?: boolean
  }[] = []

  for (const p of activeProvinces) {
    let score = p.cachedScore as number | null

    if (score == null) {
      // Never return 0 for a province that has pushed before — carry forward last known value.
      score = await getCarryForwardScore(p.slug)
    }

    components.push({
      slug: p.slug,
      score,
      weight: (p.weight as number | null) ?? BASE_WEIGHTS[p.slug] ?? 0,
    })
  }

  const characterScore = await getCharacterScore()
  if (characterScore != null) {
    components.push({ slug: 'character', score: characterScore, weight: BASE_WEIGHTS.character })
  }

  const missionScore = await getMissionScore()
  if (missionScore != null) {
    components.push({ slug: 'mission', score: missionScore, weight: BASE_WEIGHTS.mission })
  }

  // Only include components that actually resolved to a score.
  const scored = components.filter((c) => c.score != null) as {
    slug: string
    score: number
    weight: number
  }[]

  const weightSum = scored.reduce((sum, c) => sum + c.weight, 0)
  const lifeScore =
    weightSum > 0
      ? scored.reduce((sum, c) => sum + c.score * c.weight, 0) / weightSum
      : 0

  const date = todayPKT()

  // Persist today's total so tomorrow's carry-forward / history graphs have something to read.
  try {
    await db
      .insert(lifeScoreHistory)
      .values({ date, slug: 'total', score: lifeScore } as any)
      .onConflictDoUpdate?.({
        target: [lifeScoreHistory.date, lifeScoreHistory.slug] as any,
        set: { score: lifeScore },
      })
  } catch {
    // If there's no unique constraint on (date, slug) yet, this insert may fail silently —
    // safe to ignore, it's a best-effort cache write, not the source of truth.
  }

  return NextResponse.json({
    date,
    lifeScore: Math.round(lifeScore * 10) / 10,
    components: scored.map((c) => ({
      slug: c.slug,
      score: Math.round(c.score * 10) / 10,
      weight: Math.round((c.weight / weightSum) * 1000) / 1000,
    })),
  })
}
