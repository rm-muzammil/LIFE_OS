// app/api/github-boxes/route.ts
// Returns last 365 days with green/grey status.
// Green = all 4 done: salah(5/5) + raku completed + verse done + dhikr
// Returns compact array to minimise payload.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { rakuProgress, memorizationLog } from '@/db/schema/quran'
import { sql, gte } from 'drizzle-orm'
import { subDays, format, eachDayOfInterval } from 'date-fns'

export async function GET() {
  const today     = new Date()
  const startDate = subDays(today, 364) // 365 days including today

  const startStr = format(startDate, 'yyyy-MM-dd')
  const todayStr = format(today,     'yyyy-MM-dd')

  // Fetch all ibadah rows in range
  const ibadahRows = await db
    .select({
      date:    ibadah.date,
      fajr:    ibadah.fajr,
      dhuhr:   ibadah.dhuhr,
      asr:     ibadah.asr,
      maghrib: ibadah.maghrib,
      isha:    ibadah.isha,
      dhikr:   ibadah.dhikrDone,
    })
    .from(ibadah)
    .where(gte(ibadah.date, startStr))

  // Fetch raku completed dates in range
  const rakuRows = await db
    .select({ day: sql<string>`DATE(${rakuProgress.completedAt})` })
    .from(rakuProgress)
    .where(sql`DATE(${rakuProgress.completedAt}) >= ${startStr}`)

  // Fetch verse done dates in range
  const verseRows = await db
    .select({ logDate: memorizationLog.logDate, done: memorizationLog.done })
    .from(memorizationLog)
    .where(gte(memorizationLog.logDate, startStr))

  // Build lookup sets for O(1) access
  const ibadahMap  = new Map(ibadahRows.map(r => [r.date, r]))
  const rakuDates  = new Set(rakuRows.map(r => r.day))
  const verseDates = new Set(
    verseRows.filter(r => r.done).map(r => r.logDate)
  )

  // Generate every day in range
  const days = eachDayOfInterval({ start: startDate, end: today })

  const result = days.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd')
    const row     = ibadahMap.get(dateStr)

    const allSalah = !!(row?.fajr && row.dhuhr && row.asr && row.maghrib && row.isha)
    const rakuDone = rakuDates.has(dateStr)
    const verseDone = verseDates.has(dateStr)
    const dhikrDone = !!row?.dhikr

    const green = allSalah && rakuDone && verseDone && dhikrDone

    return {
      date:  dateStr,
      green,
      // breakdown for tooltip
      s: allSalah,  // salah
      r: rakuDone,  // raku
      v: verseDone, // verse
      d: dhikrDone, // dhikr
    }
  })

  // Current streak — consecutive green days ending today
  let streak = 0
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].green) streak++
    else break
  }

  return NextResponse.json({ days: result, streak, total: result.length })
}
