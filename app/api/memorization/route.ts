// app/api/memorization/route.ts
import { db } from "@/lib/db";
import { memorizationLog } from "@/db/schema/quran";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { JUZ30_VERSES } from "@/lib/quranData";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// GET /api/memorization
// Returns today's verse (creates row if missing), streak, history
export async function GET() {
  try {
    const today = todayStr();

    // Find or create today's entry
    let todayRow = await db
      .select()
      .from(memorizationLog)
      .where(eq(memorizationLog.logDate, today))
      .limit(1);

    if (todayRow.length === 0) {
      // Determine which verse index to assign today
      // Find the highest verseIndex already assigned
      const latest = await db
        .select()
        .from(memorizationLog)
        .orderBy(desc(memorizationLog.verseIndex))
        .limit(1);

      const nextIndex =
        latest.length === 0
          ? 0
          : Math.min(latest[0].verseIndex + 1, JUZ30_VERSES.length - 1);

      const verse = JUZ30_VERSES[nextIndex];
      await db.insert(memorizationLog).values({
        logDate: today,
        verseIndex: nextIndex,
        surahNum: verse.surahNum,
        ayahNum: verse.ayahNum,
        done: false,
      });

      todayRow = await db
        .select()
        .from(memorizationLog)
        .where(eq(memorizationLog.logDate, today))
        .limit(1);
    }

    const row = todayRow[0];
    const verse = JUZ30_VERSES[row.verseIndex];

    // Compute streak: consecutive days ending today where done=true
    const allRows = await db
      .select()
      .from(memorizationLog)
      .orderBy(desc(memorizationLog.logDate));

    let streak = 0;
    const d = new Date(today);
    for (const r of allRows) {
      const rowDate = r.logDate;
      const expected = d.toISOString().split("T")[0];
      if (rowDate === expected && r.done) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (rowDate === today && !r.done) {
        // Today not done yet — check yesterday for streak
        d.setDate(d.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    return NextResponse.json({
      today: { ...row, verse },
      streak,
      totalVerses: JUZ30_VERSES.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch memorization" },
      { status: 500 }
    );
  }
}

// POST /api/memorization
// Body: { date, done }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { done } = body;
    const today = todayStr();

    await db
      .update(memorizationLog)
      .set({ done })
      .where(eq(memorizationLog.logDate, today));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update memorization" },
      { status: 500 }
    );
  }
}