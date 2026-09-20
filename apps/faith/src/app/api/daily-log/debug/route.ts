// src/app/api/daily-log/debug/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db.select().from(dailyLog).where(eq(dailyLog.date, today)).limit(1);
  return NextResponse.json({ today, row: row ?? null });
}