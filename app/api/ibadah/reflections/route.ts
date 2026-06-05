// app/api/ibadah/reflections/route.ts
// Returns last 30 non-empty reflections, newest first.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { desc, ne } from 'drizzle-orm'
import { format, parseISO } from 'date-fns'

export async function GET() {
  const rows = await db
    .select({ date: ibadah.date, reflection: ibadah.reflection })
    .from(ibadah)
    .where(ne(ibadah.reflection, ''))
    .orderBy(desc(ibadah.date))
    .limit(30)

  const reflections = rows
    .filter(r => r.reflection.trim().length > 0)
    .map(r => ({
      date:       format(parseISO(r.date), 'EEE d MMM yyyy'),
      reflection: r.reflection,
    }))

  return NextResponse.json({ reflections })
}
