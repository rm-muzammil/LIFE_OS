import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinceDailySnapshots } from '@/db/schema'
import { eq, gte, desc, and } from 'drizzle-orm'

function daysAgoPKT(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

function isGreen(details: any) {
  return (
    details?.salah === 5 &&
    !!details?.rakuDone &&
    !!details?.verseDone &&
    !!details?.dhikrDone
  )
}

// Returns last 30 days from province_daily_snapshots — green = all 4 Faith criteria met.
// Today is always accurate since it's written by /api/provinces/report on every push (see Fix 7).
export async function GET() {
  const since = daysAgoPKT(30)

  const rows = await db
    .select()
    .from(provinceDailySnapshots)
    .where(
      and(
        eq(provinceDailySnapshots.slug, 'faith'),
        gte(provinceDailySnapshots.date, since)
      )
    )
    .orderBy(desc(provinceDailySnapshots.date))

  const days = rows.map((r) => ({
    date: r.date,
    green: isGreen(r.details),
  }))

  return NextResponse.json({ days })
}
