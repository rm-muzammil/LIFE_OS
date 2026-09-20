import { AdhkarPageClient } from "../AdhkarPageClient";
import { EVENING_ADHKAR } from "@/lib/adhkar";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export default async function EveningAdhkarPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM dhikr_counts WHERE date = ${today} AND dhikr_key LIKE 'evening_%'`;
  const counts: Record<string, { count: number; completed: boolean }> = {};
  for (const r of rows as any[]) {
    counts[r.dhikr_key] = { count: r.count, completed: r.completed };
  }
  return (
    <AdhkarPageClient
      title="Evening Adhkar"
      titleAr="أذكار المساء"
      subtitle="Recite after Asr prayer"
      items={EVENING_ADHKAR}
      today={today}
      initialCounts={counts}
      backHref="/dhikr"
    />
  );
}