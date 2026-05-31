// app/api/raku/route.ts
import { db } from "@/lib/db";
import { rakuProgress } from "@/db/schema/quran";
import { eq, desc, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TOTAL_RAKU } from "@/lib/quranData";

// GET /api/raku
// Returns: current raku number + its progress row (if any) + streak
export async function GET() {
  try {
    // Find the highest raku that has a row
    const rows = await db
      .select()
      .from(rakuProgress)
      .orderBy(desc(rakuProgress.rakuNum))
      .limit(1);

    let currentRaku = 1;
    let currentRow = null;

    if (rows.length > 0) {
      const latest = rows[0];
      const allDone =
        latest.tafseerdone &&
        latest.tajweedConfidence !== null &&
        latest.vocabPasted;

      if (allDone) {
        // Advance to next raku
        currentRaku = Math.min(latest.rakuNum + 1, TOTAL_RAKU);
        currentRow = null;
      } else {
        currentRaku = latest.rakuNum;
        currentRow = latest;
      }
    }

    // Compute streak: consecutive completed rakus ending at latest
    const allCompleted = await db
      .select({ rakuNum: rakuProgress.rakuNum })
      .from(rakuProgress)
      .where(eq(rakuProgress.completedAt, rakuProgress.completedAt)) // filter non-null completedAt
      .orderBy(desc(rakuProgress.rakuNum));

    // Simple streak: count consecutive from top
    let streak = 0;
    const completedNums = allCompleted.map((r) => r.rakuNum);
    // Actually filter only truly completed rows
    const completed = await db
      .select()
      .from(rakuProgress)
      .orderBy(desc(rakuProgress.rakuNum));

    let streakCount = 0;
    let expected = currentRaku - 1;
    for (const row of completed) {
      const isDone =
        row.tafseerdone && row.tajweedConfidence !== null && row.vocabPasted;
      if (isDone && row.rakuNum === expected) {
        streakCount++;
        expected--;
      } else {
        break;
      }
    }

    const percentComplete = (((currentRaku - 1) / TOTAL_RAKU) * 100).toFixed(1);

    return NextResponse.json({
      currentRaku,
      totalRaku: TOTAL_RAKU,
      percentComplete,
      streak: streakCount,
      progress: currentRow,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch raku" }, { status: 500 });
  }
}

// POST /api/raku
// Body: { rakuNum } — creates or updates the progress row
// Patch fields: tafseerdone, tajweedConfidence, vocabPasted
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rakuNum, tafseerdone, tajweedConfidence, vocabPasted } = body;

    if (!rakuNum || rakuNum < 1 || rakuNum > TOTAL_RAKU) {
      return NextResponse.json({ error: "Invalid rakuNum" }, { status: 400 });
    }

    // Upsert
    const existing = await db
      .select()
      .from(rakuProgress)
      .where(eq(rakuProgress.rakuNum, rakuNum))
      .limit(1);

    const allDone =
      (tafseerdone ?? existing[0]?.tafseerdone ?? false) &&
      (tajweedConfidence ?? existing[0]?.tajweedConfidence) !== null &&
      (tajweedConfidence ?? existing[0]?.tajweedConfidence) !== undefined &&
      (vocabPasted ?? existing[0]?.vocabPasted ?? false);

    const completedAt = allDone ? new Date() : null;

    if (existing.length === 0) {
      await db.insert(rakuProgress).values({
        rakuNum,
        tafseerdone: tafseerdone ?? false,
        tajweedConfidence: tajweedConfidence ?? null,
        vocabPasted: vocabPasted ?? false,
        completedAt: completedAt,
      });
    } else {
      const updates: Partial<typeof rakuProgress.$inferInsert> = {};
      if (tafseerdone !== undefined) updates.tafseerdone = tafseerdone;
      if (tajweedConfidence !== undefined)
        updates.tajweedConfidence = tajweedConfidence;
      if (vocabPasted !== undefined) updates.vocabPasted = vocabPasted;
      if (allDone && !existing[0].completedAt)
        updates.completedAt = new Date();

      await db
        .update(rakuProgress)
        .set(updates)
        .where(eq(rakuProgress.rakuNum, rakuNum));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update raku" }, { status: 500 });
  }
}