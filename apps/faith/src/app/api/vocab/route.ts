import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vocabBank } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const rakuNum = req.nextUrl.searchParams.get("raku");
  const rows = await db.select().from(vocabBank)
    .where(rakuNum
      ? and(eq(vocabBank.userId, userId), eq(vocabBank.rakuNumber, parseInt(rakuNum)))
      : eq(vocabBank.userId, userId))
    .orderBy(desc(vocabBank.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const { rakuNumber, word, root, meaning, status } = await req.json();
  if (!word || !meaning || !rakuNumber) {
    return NextResponse.json({ error: "word, meaning, rakuNumber required" }, { status: 400 });
  }
  const [saved] = await db.insert(vocabBank)
    .values({ userId, rakuNumber, word, root: root ?? null, meaning, status: status ?? "new" })
    .returning();
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.delete(vocabBank)
    .where(and(eq(vocabBank.id, parseInt(id)), eq(vocabBank.userId, userId)));
  return NextResponse.json({ ok: true });
}