// app/api/daily-score/route.ts
// Daily Faith governance score — recalculates on every request.
//
// Scoring:
//   Salah (all 5)   50 pts  (10 per prayer)
//   Raku completed  20 pts  (completedAt::date = today)
//   Verse done      20 pts  (memorization_log.done = true for today)
//   Dhikr           10 pts
//   ─────────────────────
//   Total          100 pts

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { rakuProgress, memorizationLog } from '@/db/schema/quran'
import { eq, sql } from 'drizzle-orm'
import { todayStr } from '@/lib/utils'

const WEIGHTS = {
  perPrayer: 10,   // × 5 = 50
  raku:      20,
  verse:     20,
  dhikr:     10,
}

export async function GET() {
  const today = todayStr()

  // Fetch today's ibadah row
  const [row] = await db.select().from(ibadah).where(eq(ibadah.date, today))

  // Check if any raku was completed today
  const [rakuRow] = await db
    .select({ id: rakuProgress.id })
    .from(rakuProgress)
    .where(sql`DATE(${rakuProgress.completedAt}) = ${today}`)
    .limit(1)

  // Check if today's verse is marked done
  const [verseRow] = await db
    .select({ done: memorizationLog.done })
    .from(memorizationLog)
    .where(eq(memorizationLog.logDate, today))
    .limit(1)

  const prayers = row
    ? [row.fajr, row.dhuhr, row.asr, row.maghrib, row.isha].filter(Boolean).length
    : 0

  const score =
    prayers * WEIGHTS.perPrayer +
    (rakuRow ? WEIGHTS.raku : 0) +
    (verseRow?.done ? WEIGHTS.verse : 0) +
    (row?.dhikrDone ? WEIGHTS.dhikr : 0)

  return NextResponse.json({
    score,                          // 0–100
    breakdown: {
      salah:   prayers * WEIGHTS.perPrayer,
      raku:    rakuRow ? WEIGHTS.raku : 0,
      verse:   verseRow?.done ? WEIGHTS.verse : 0,
      dhikr:   row?.dhikrDone ? WEIGHTS.dhikr : 0,
    },
    prayers,                        // 0–5
    rakuDone:  !!rakuRow,
    verseDone: !!verseRow?.done,
    dhikrDone: !!row?.dhikrDone,
  })
}
