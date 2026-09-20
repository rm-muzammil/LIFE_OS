import { QuranClient } from "./QuranClient";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function QuranPage() {
  const allSettings = await db.select().from(settings);
  const map = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));

  const currentIndex = Math.max(0, parseInt(map["current_verse_index"] ?? "0", 10));
  const verseLastAdvanced = map["verse_last_advanced"] ?? "";

  return (
    <QuranClient
      currentIndex={currentIndex}
      verseLastAdvanced={verseLastAdvanced}
    />
  );
}