import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { calcStreak } from '@/lib/utils'

export async function GET() {
  // Fetch all dates that had at least all 5 prayers done
  const rows = await db
    .select({ date: ibadah.date, fajr: ibadah.fajr, dhuhr: ibadah.dhuhr,
               asr: ibadah.asr, maghrib: ibadah.maghrib, isha: ibadah.isha })
    .from(ibadah)

  // Streak counts days where all 5 prayers were completed
  const fullDays = rows
    .filter(r => r.fajr && r.dhuhr && r.asr && r.maghrib && r.isha)
    .map(r => r.date)

  const streak = calcStreak(fullDays)
  const totalDays = rows.length
  const fullPrayerDays = fullDays.length

  return NextResponse.json({ streak, totalDays, fullPrayerDays })
}
