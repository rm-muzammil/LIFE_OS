import { RakuClient } from "./RakuClient";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import { vocabBank } from "@/db/schema";
import { count } from "drizzle-orm";
import type { RakuProgress } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function RakuPage() {
  // Use raw SQL to avoid Drizzle camelCase mapping issue
  const sql = neon(process.env.DATABASE_URL!);
  const raw = await sql`SELECT * FROM raku_progress ORDER BY raku_number ASC`;

  // Map snake_case → camelCase manually
  const rows: RakuProgress[] = raw.map((r: any) => ({
    id: r.id,
    rakuNumber: r.raku_number,
    tafseerDone: r.tafseer_done,
    tajweedConfidence: r.tajweed_confidence,
    vocabExtracted: r.vocab_extracted,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    notes: r.notes,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));

  const completedNums = new Set(
    rows
      .filter((r) => r.tafseerDone && r.tajweedConfidence > 0 && r.vocabExtracted)
      .map((r) => r.rakuNumber)
  );

  let currentRaku = 1;
  for (let i = 1; i <= 558; i++) {
    if (!completedNums.has(i)) {
      currentRaku = i;
      break;
    }
  }

  const [{ count: totalVocab }] = await db
    .select({ count: count() })
    .from(vocabBank);

  console.log("[raku] raw rows:", raw.length, "mapped:", rows.length, "completed:", completedNums.size, "current:", currentRaku);

  return (
  <RakuClient
    key={Date.now()}
    progress={rows}
    currentRaku={currentRaku}
    totalVocab={totalVocab as number}
  />
  );
}