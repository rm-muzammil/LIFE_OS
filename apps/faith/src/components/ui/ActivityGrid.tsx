"use client";
import { cn } from "@/lib/utils";
import { format, parseISO, eachDayOfInterval, subDays } from "date-fns";

interface Props {
  data: { date: string; green: boolean; score: number }[];
}

export function ActivityGrid({ data }: Props) {
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 89), end: today });
  const map = new Map(data.map((d) => [d.date, d]));

  // Group into weeks (cols)
  const weeks: Date[][] = [];
  let week: Date[] = [];
  days.forEach((day, i) => {
    week.push(day);
    if (week.length === 7 || i === days.length - 1) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="flex gap-1 min-w-max px-1">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wk.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const entry = map.get(iso);
              const isToday = iso === format(today, "yyyy-MM-dd");
              return (
                <div
                  key={iso}
                  title={`${iso}${entry ? ` · ${entry.score}pts` : ""}`}
                  className={cn(
                    "w-3 h-3 rounded-sm border transition-all",
                    entry?.green
                      ? "bg-brand-500 border-brand-600"
                      : entry
                      ? "bg-brand-900/50 border-brand-800/50"
                      : "bg-zinc-800 border-zinc-700/50",
                    isToday && "ring-1 ring-brand-400 ring-offset-1 ring-offset-zinc-900"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        <span className="text-[10px] text-zinc-600">Less</span>
        {["bg-zinc-800", "bg-brand-900/50", "bg-brand-500"].map((c) => (
          <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
        ))}
        <span className="text-[10px] text-zinc-600">More</span>
      </div>
    </div>
  );
}
