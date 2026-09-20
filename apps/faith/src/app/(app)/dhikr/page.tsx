import Link from "next/link";
import { neon } from "@neondatabase/serverless";
import { CheckCircle2, Circle, Moon, Sun, Star, Hash } from "lucide-react";
import { MORNING_ADHKAR, EVENING_ADHKAR, BEFORE_SLEEP_ADHKAR } from "@/lib/adhkar";

export const dynamic = "force-dynamic";

export default async function DhikrHubPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT dhikr_key, completed FROM dhikr_counts WHERE date = ${today}`;
  const doneSet = new Set((rows as any[]).filter((r) => r.completed).map((r) => r.dhikr_key as string));

  const morningDone = MORNING_ADHKAR.filter((i) => doneSet.has(i.key)).length;
  const eveningDone = EVENING_ADHKAR.filter((i) => doneSet.has(i.key)).length;
  const sleepDone   = BEFORE_SLEEP_ADHKAR.filter((i) => doneSet.has(i.key)).length;


  const sections = [
    {
      href: "/dhikr/morning",
      label: "Morning Adhkar",
      labelAr: "أذكار الصباح",
      icon: Sun,
      done: morningDone,
      total: MORNING_ADHKAR.length,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      href: "/dhikr/evening",
      label: "Evening Adhkar",
      labelAr: "أذكار المساء",
      icon: Moon,
      done: eveningDone,
      total: EVENING_ADHKAR.length,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      href: "/dhikr/sleep",
      label: "Before Sleep",
      labelAr: "أذكار النوم",
      icon: Star,
      done: sleepDone,
      total: BEFORE_SLEEP_ADHKAR.length,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Daily</p>
        <h1 className="text-xl font-bold text-zinc-100">Adhkar & Dhikr</h1>
        <p className="text-xs text-zinc-500 mt-1">{today}</p>
      </div>

      <div className="space-y-3">
        {sections.map(({ href, label, labelAr, icon: Icon, done, total, color, bg }) => {
          const allDone = done === total;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${allDone ? bg : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allDone ? bg : "bg-zinc-800"}`}>
                  <Icon className={`w-5 h-5 ${allDone ? color : "text-zinc-500"}`} strokeWidth={1.75} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${allDone ? "text-zinc-200" : "text-zinc-300"}`}>{label}</p>
                  <p className="text-xs text-zinc-500 arabic-text" dir="rtl">{labelAr}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${allDone ? color : "text-zinc-400"}`}>
                    {done}/{total}
                  </p>
                  <p className="text-[10px] text-zinc-600">completed</p>
                </div>
                {allDone
                  ? <CheckCircle2 className={`w-5 h-5 ${color}`} />
                  : <Circle className="w-5 h-5 text-zinc-700" />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}