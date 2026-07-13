import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces, provinceDailySnapshots } from '@/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

function daysAgoPKT(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export async function GET() {
  const [faith] = await db.select().from(provinces).where(eq(provinces.slug, 'faith'))

  if (!faith) {
    return NextResponse.json({ connected: false, days: [] })
  }

  // Prefer pulling live history directly from Faith Tracker if it exposes /api/activity.
  const faithUrl = (faith as any).url as string | undefined
  if (faithUrl) {
    try {
      const res = await fetch(`${faithUrl.replace(/\/$/, '')}/api/activity`, {
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        // Expected shape: { days: [{ date, salah, rakuDone, verseDone, dhikrDone }, ...] }
        if (Array.isArray(data.days)) {
          const days = data.days.map((d: any) => ({
            date: d.date,
            green:
              d.salah === 5 && !!d.rakuDone && !!d.verseDone && !!d.dhikrDone,
          }))
          return NextResponse.json({ connected: true, source: 'pull', days })
        }
      }
    } catch {
      // Faith Tracker unreachable — fall through to local snapshot history.
    }
  }

  // Fallback: last 30 days from our own province_daily_snapshots table.
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

  const days = rows.map((r) => {
    const details = (r.details as any) ?? {}
    return {
      date: r.date,
      green:
        details.salah === 5 &&
        !!details.rakuDone &&
        !!details.verseDone &&
        !!details.dhikrDone,
    }
  })

  return NextResponse.json({ connected: true, source: 'snapshots', days })
}
