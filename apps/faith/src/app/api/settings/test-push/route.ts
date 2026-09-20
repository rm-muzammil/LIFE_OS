// src/app/api/settings/test-push/route.ts
// Called by Settings UI to test province push to SK.
// Returns actual error message instead of silently swallowing.

import { NextResponse } from "next/server"
import { db } from "@/db"
import { settings, dailyLog } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { todayISO } from "@/lib/utils"

export async function POST() {
  // Get SK credentials
  const rows = await db.select().from(settings)
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const skUrl  = cfg["sk_url"]
  const apiKey = cfg["api_key"]

  if (!skUrl || !apiKey) {
    return NextResponse.json({ ok: false, error: "SK URL or API key not configured" })
  }

  // Build a test payload from today's log or use dummy data
  const today = todayISO()
  const [row] = await db.select().from(dailyLog).where(eq(dailyLog.date, today)).limit(1)

  const payload = {
    score:      row?.finalScore ?? 0,
    label:      "Faith",
    streak:     0,
    todayDone:  false,
    updatedAt:  new Date().toISOString(),
    details:    { test: true },
  }

  try {
    const res = await fetch(`${skUrl}/api/provinces/report`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `SK returned HTTP ${res.status}: ${text}`,
      })
    }

    return NextResponse.json({ ok: true, response: text })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Network error — could not reach SK",
    })
  }
}