"use client";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  sublabel?: string;
  pts?: number;
}

export function StarRating({ value, max = 5, onChange, label, sublabel, pts }: Props) {
  return (
    <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {sublabel && <span className="text-[11px] text-zinc-500">{sublabel}</span>}
        {pts !== undefined && (
          <span className="text-[10px] text-zinc-600 font-mono">{pts}pt</span>
        )}
      </div>
      <div className="flex gap-1 star-row">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className={cn(
              "w-8 h-8 rounded-lg text-sm font-semibold transition-all duration-150",
              n <= value
                ? "bg-brand-500 text-zinc-950"
                : "bg-zinc-700 text-zinc-500 hover:bg-zinc-600"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
