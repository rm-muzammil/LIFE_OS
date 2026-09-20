// Server component — fetches accurate Hijri date from Aladhan API
import { getHijriDate } from "@/lib/hijri";
import { cn } from "@/lib/utils";

export async function HijriDateBadge({ className }: { className?: string }) {
  const hijri = await getHijriDate(new Date());

  return (
    <div className={cn("flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5", className)}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
          Islamic Date {hijri.source === "calculated" ? "· estimated" : ""}
        </span>
        <span className="text-sm font-medium text-zinc-300">{hijri.formatted}</span>
        <span className="text-xs text-zinc-500">{hijri.dayName}</span>
      </div>
      <span
        className="arabic-text text-lg text-zinc-400 leading-relaxed"
        dir="rtl"
      >
        {hijri.formattedAr}
      </span>
    </div>
  );
}