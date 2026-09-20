"use client";
import { cn } from "@/lib/utils";

const PRAYERS = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
] as const;

interface Props {
  fields: { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean; onTime: number };
  set: (key: any, value: any) => void;
}

export function SalahSection({ fields, set }: Props) {
  const prayed = PRAYERS.filter((p) => fields[p.key]).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">Salah</p>
        <span className="text-xs font-mono text-zinc-500">{prayed}/5 prayers · 50pts</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {PRAYERS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => set(key, !fields[key])}
            className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95",
              fields[key] ? "bg-brand-500/20 border-brand-500/50 text-brand-300" : "bg-zinc-800/60 border-zinc-700/50 text-zinc-500")}>
            <div className={cn("w-2 h-2 rounded-full", fields[key] ? "bg-brand-400" : "bg-zinc-600")} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Prayed on time</span>
          <span className="text-[10px] text-zinc-600 font-mono">10pt</span>
        </div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((n) => (
            <button key={n} type="button" onClick={() => set("onTime", fields.onTime === n ? 0 : n)}
              className={cn("w-8 h-8 rounded-lg text-sm font-semibold transition-all duration-150",
                n <= fields.onTime ? "bg-brand-500 text-zinc-950" : "bg-zinc-700 text-zinc-500 hover:bg-zinc-600")}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}