// app/api/life-score/route.ts
// Faith 60% now sourced from provinces cache (slug='faith').
// Character 25%, Mission 15% unchanged.
// Province weights are carried forward — never zero on missing data.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characterRatings, weeklyReview, lifeScoreHistory, provinces } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { startOfWeek, format } from 'date-fns'

const W = { faith: 0.60, character: 0.25, mission: 0.15 }

export async function GET() {
  const today     = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })

  // ── Faith: province cache (slug='faith'), carry forward if null ───────────
  const [faithProvince] = await db
    .select({ cachedScore: provinces.cachedScore })
    .from(provinces)
    .where(eq(provinces.slug, 'faith'))
    .limit(1)

  // Fall back to last stored life score history faith value if province not yet set
  const [lastHistory] = await db
    .select({ faithScore: lifeScoreHistory.faithScore })
    .from(lifeScoreHistory)
    .orderBy(desc(lifeScoreHistory.weekStart))
    .limit(1)

  const faithScore = Math.round(
    faithProvince?.cachedScore
      ?? lastHistory?.faithScore
      ?? 0
  )

  // ── Character: latest rating, scaled 0–100 ────────────────────────────────
  const [latestChar] = await db
    .select()
    .from(characterRatings)
    .orderBy(desc(characterRatings.isoWeek))
    .limit(1)

  const characterScore = latestChar
    ? Math.round(
        ((latestChar.patience + latestChar.discipline + latestChar.gratitude +
          latestChar.humility + latestChar.truthfulness) / 25) * 100
      )
    : 0

  // ── Mission: latest review, carried forward, scaled 0–100 ─────────────────
  const [latestReview] = await db
    .select({ score: weeklyReview.missionAlignScore })
    .from(weeklyReview)
    .orderBy(desc(weeklyReview.isoWeek))
    .limit(1)

  const missionScore = latestReview
    ? Math.round(((latestReview.score - 1) / 4) * 100)
    : 0

  // ── Total ──────────────────────────────────────────────────────────────────
  const totalScore = Math.round(
    faithScore     * W.faith +
    characterScore * W.character +
    missionScore   * W.mission
  )

  // ── History: last 12 weeks ─────────────────────────────────────────────────
  const history = await db
    .select()
    .from(lifeScoreHistory)
    .orderBy(desc(lifeScoreHistory.weekStart))
    .limit(12)

  return NextResponse.json({
    current: { faithScore, characterScore, missionScore, totalScore },
    weights: W,
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    history: history.reverse(),
  })
}