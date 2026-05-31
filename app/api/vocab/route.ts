// app/api/vocab/route.ts
import { db } from "@/lib/db";
import { vocabBank } from "@/db/schema/quran";
import { eq, desc, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/vocab?status=new&search=word
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = db.select().from(vocabBank).orderBy(desc(vocabBank.createdAt));

    const rows = await query;

    let filtered = rows;
    if (status && status !== "all") {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.word.includes(search) ||
          r.root?.includes(search) ||
          r.meaning.toLowerCase().includes(s)
      );
    }

    const counts = {
      new: rows.filter((r) => r.status === "new").length,
      familiar: rows.filter((r) => r.status === "familiar").length,
      known: rows.filter((r) => r.status === "known").length,
      total: rows.length,
    };

    return NextResponse.json({ words: filtered, counts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch vocab" }, { status: 500 });
  }
}

// POST /api/vocab
// Body: { words: Array<{word, root?, meaning, firstSeenRaku}> }  (bulk paste)
// OR: { id, status }  (status update)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Status update
    if (body.id && body.status) {
      await db
        .update(vocabBank)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(vocabBank.id, body.id));
      return NextResponse.json({ ok: true });
    }

    // Bulk insert
    if (body.words && Array.isArray(body.words)) {
      const toInsert = body.words.filter(
        (w: any) => w.word?.trim() && w.meaning?.trim()
      );
      if (toInsert.length === 0) {
        return NextResponse.json({ error: "No valid words" }, { status: 400 });
      }
      await db.insert(vocabBank).values(
        toInsert.map((w: any) => ({
          word: w.word.trim(),
          root: w.root?.trim() || null,
          meaning: w.meaning.trim(),
          firstSeenRaku: w.firstSeenRaku,
          status: "new" as const,
        }))
      );
      return NextResponse.json({ ok: true, count: toInsert.length });
    }

    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save vocab" }, { status: 500 });
  }
}

// DELETE /api/vocab?id=123
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });
    await db.delete(vocabBank).where(eq(vocabBank.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}