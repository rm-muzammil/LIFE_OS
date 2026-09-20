import { VocabClient } from "./VocabClient";
import { db } from "@/db";
import { vocabBank } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function VocabPage() {
  const words = await db
    .select()
    .from(vocabBank)
    .orderBy(desc(vocabBank.createdAt));

  return <VocabClient initialWords={words} />;
}
