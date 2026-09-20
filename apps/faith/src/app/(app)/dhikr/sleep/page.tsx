import { AdhkarPageClient } from "../AdhkarPageClient";
import { BEFORE_SLEEP_ADHKAR } from "@/lib/adhkar";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export default async function SleepAdhkarPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM dhikr_counts WHERE date = ${today} AND dhikr_key LIKE 'sleep_%'`;
  const counts: Record<string, { count: number; completed: boolean }> = {};
  for (const r of rows as any[]) {
    counts[r.dhikr_key] = { count: r.count, completed: r.completed };
  }
  return (
    <AdhkarPageClient
      title="Before Sleep"
      titleAr="أذكار النوم"
      subtitle="Recite before sleeping"
      items={BEFORE_SLEEP_ADHKAR}
      today={today}
      initialCounts={counts}
      backHref="/dhikr"
    />
  );
}