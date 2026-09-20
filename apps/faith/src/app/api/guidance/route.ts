import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLog, settings } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { getHijriDate } from "@/lib/hijri";
import { generateDailyGuidance } from "@/lib/guidance";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const today = new Date().toISOString().slice(0, 10);
  const allSettings = await db.select().from(settings).where(eq(settings.userId, userId));
  const settingMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));

  const cachedDate     = settingMap["daily_guidance_date"] ?? "";
  const cachedGuidance = settingMap["daily_guidance"] ?? "";

  if (cachedDate === today && cachedGuidance) {
    try { return NextResponse.json(JSON.parse(cachedGuidance)); } catch {}
  }

  const geminiKey = settingMap["gemini_api_key"] ?? process.env.GEMINI_API_KEY ?? "";
  if (!geminiKey) return NextResponse.json({ error: "no_api_key" }, { status: 503 });

  const recentLogs = await db.select().from(dailyLog)
    .where(eq(dailyLog.userId, userId))
    .orderBy(desc(dailyLog.date)).limit(7);

  const hijri    = await getHijriDate(new Date(), settingMap);
  const guidance = await generateDailyGuidance(recentLogs, hijri, geminiKey);
  if (!guidance) return NextResponse.json({ error: "generation_failed" }, { status: 503 });

  const guidanceJson = JSON.stringify(guidance);
  for (const [key, value] of [["daily_guidance", guidanceJson], ["daily_guidance_date", today]] as const) {
    await db.insert(settings).values({ userId, key, value })
      .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value, updatedAt: new Date() } });
  }

  return NextResponse.json(guidance);
}

export async function DELETE(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  await db.insert(settings).values({ userId, key: "daily_guidance_date", value: "" })
    .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value: "", updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}