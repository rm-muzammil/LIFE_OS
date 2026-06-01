import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { gte } from 'drizzle-orm'

// Weights — adjust as desired
const WEIGHTS = {
  prayers:   0.40,   // 5 prayers → each worth 8%
  quran:     0.25,   // ≥4 pages = full credit
  mulk:      0.15,
  kahf:      0.10,   // only counted on Fridays
  dhikr:     0.10,
}

function prayerScore(row: { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }) {
  return ([row.fajr, row.dhuhr, row.asr, row.maghrib, row.isha].filter(Boolean).length / 5)
}

// GET /api/faith-score?days=7   → rolling score 0–100
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '7', 10), 30)

  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const sinceStr = since.toISOString().slice(0, 10)

  const rows = await db
    .select()
    .from(ibadah)
    .where(gte(ibadah.date, sinceStr))

  if (rows.length === 0) return NextResponse.json({ score: 0, days: 0 })

  let total = 0
  for (const row of rows) {
    const date = new Date(row.date)
    const isFriday = date.getUTCDay() === 5

    const dayScore =
      prayerScore(row)                    * WEIGHTS.prayers +
      (row.quranPages >= 4 ? 1 : row.quranPages / 4) * WEIGHTS.quran +
      (row.surahMulk ? 1 : 0)            * WEIGHTS.mulk +
      (isFriday ? (row.surahKahf ? 1 : 0) : 1) * WEIGHTS.kahf + // non-Friday = full kahf credit
      (row.dhikrDone ? 1 : 0)            * WEIGHTS.dhikr

    total += dayScore
  }

  const score = Math.round((total / rows.length) * 100)
  return NextResponse.json({ score, days: rows.length })
}