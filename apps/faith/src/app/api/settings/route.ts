import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  return NextResponse.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings).values({ userId, key, value: String(value) })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  return NextResponse.json({ ok: true });
}