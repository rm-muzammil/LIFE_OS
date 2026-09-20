import { AdhkarPageClient } from "../AdhkarPageClient";
import { MORNING_ADHKAR } from "@/lib/adhkar";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export default async function MorningAdhkarPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM dhikr_counts WHERE date = ${today} AND dhikr_key LIKE 'morning_%'`;
  const counts: Record<string, { count: number; completed: boolean }> = {};
  for (const r of rows as any[]) {
    counts[r.dhikr_key] = { count: r.count, completed: r.completed };
  }
  return (
    <AdhkarPageClient
      title="Morning Adhkar"
      titleAr="أذكار الصباح"
      subtitle="Recite after Fajr prayer"
      items={MORNING_ADHKAR}
      today={today}
      initialCounts={counts}
      backHref="/dhikr"
    />
  );
}