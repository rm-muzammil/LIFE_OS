// app/api/impact/route.ts
import { db } from "@/lib/db";
import { versesOfImpact } from "@/db/schema/quran";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/impact
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(versesOfImpact)
      .orderBy(desc(versesOfImpact.savedAt));
    return NextResponse.json({ verses: rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/impact
// Body: { surahNum, ayahNum, surahName, arabic, translation, personalNote? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { surahNum, ayahNum, surahName, arabic, translation, personalNote } = body;

    if (!surahNum || !ayahNum || !arabic || !translation) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const inserted = await db
      .insert(versesOfImpact)
      .values({ surahNum, ayahNum, surahName, arabic, translation, personalNote })
      .returning();

    return NextResponse.json({ ok: true, verse: inserted[0] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// PATCH /api/impact?id=123
// Body: { personalNote }
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

    const body = await req.json();
    await db
      .update(versesOfImpact)
      .set({ personalNote: body.personalNote })
      .where(eq(versesOfImpact.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/impact?id=123
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });
    await db.delete(versesOfImpact).where(eq(versesOfImpact.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}