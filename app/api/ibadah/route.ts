// src/app/api/ibadah/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { todayStr } from '@/lib/utils'

// GET /api/ibadah?date=YYYY-MM-DD  (defaults to today)
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || todayStr()
  const rows = await db.select().from(ibadah).where(eq(ibadah.date, date))
  return NextResponse.json(rows[0] ?? null)
}

// POST /api/ibadah — upsert today's record
export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = body.date || todayStr()

  const existing = await db.select().from(ibadah).where(eq(ibadah.date, date))

  if (existing.length) {
    const updated = await db
      .update(ibadah)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(ibadah.date, date))
      .returning()
    return NextResponse.json(updated[0])
  }

  const created = await db.insert(ibadah).values({ date, ...body }).returning()
  return NextResponse.json(created[0])
}
