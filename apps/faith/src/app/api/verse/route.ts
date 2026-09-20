import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings, dailyLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchVerse, TOTAL_JUZ30_VERSES } from "@/lib/quran";
import { computeScore } from "@/lib/scoring";
import { requireUserId } from "@/lib/session";

async function getSettingMap(userId: string) {
  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function setSetting(userId: string, key: string, value: string) {
  await db.insert(settings).values({ userId, key, value })
    .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value, updatedAt: new Date() } });
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const map = await getSettingMap(userId);
  const idx = Math.min(parseInt(map["current_verse_index"] ?? "0", 10), TOTAL_JUZ30_VERSES - 1);
  const verse = await fetchVerse(idx);
  if (!verse) return NextResponse.json({ error: "Verse unavailable" }, { status: 503 });
  return NextResponse.json(verse);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const today = new Date().toISOString().slice(0, 10);
  const map = await getSettingMap(userId);
  const currentIndex = parseInt(map["current_verse_index"] ?? "0", 10);
  let nextIndex = currentIndex;
  if (map["verse_last_advanced"] !== today) {
    nextIndex = (currentIndex + 1) % TOTAL_JUZ30_VERSES;
    await setSetting(userId, "current_verse_index", String(nextIndex));
    await setSetting(userId, "verse_last_advanced", today);
  }
  const [existing] = await db.select().from(dailyLog)
    .where(and(eq(dailyLog.userId, userId), eq(dailyLog.date, today))).limit(1);
  const base = existing ?? {
    userId, date: today, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
    onTime: 0, morningAdhkar: false, eveningAdhkar: false, beforeSleepAdhkar: false,
    dhikrMinutes: 0, duaMinutes: 0, laIlaha: false, subhanallahi: false,
    quranPages: 0, tadabburMinutes: 0, tafseerDone: false, tajweedConfidence: 0,
    verseDone: false, islamicStudyMinutes: 0, surahMulk: false, surahKahf: false,
    gazeLowered: 0, haramFree: false, finalScore: 0, rawScore: 0,
  };
  const merged = { ...base, verseDone: true, updatedAt: new Date() };
  const { finalScore, rawScore } = computeScore({ ...merged, date: today });
  await db.insert(dailyLog).values({ ...merged, finalScore, rawScore })
    .onConflictDoUpdate({
      target: [dailyLog.userId, dailyLog.date],
      set: { verseDone: true, finalScore, rawScore, updatedAt: new Date() },
    });
  return NextResponse.json({ index: nextIndex, verseDone: true });
}

export async function PUT(req: Request) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const { index } = await req.json();
  const safeIdx = Math.max(0, Math.min(index, TOTAL_JUZ30_VERSES - 1));
  await setSetting(userId, "current_verse_index", String(safeIdx));
  return NextResponse.json({ index: safeIdx });
}