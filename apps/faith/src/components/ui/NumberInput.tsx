"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  pts?: number;
}

export function NumberInput({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = "min",
  pts,
}: Props) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {sublabel && (
          <span className="text-[11px] text-zinc-500">{sublabel}</span>
        )}
        {pts !== undefined && (
          <span className="text-[10px] text-zinc-600 font-mono">{pts}pt</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-all active:scale-95"
        >
          <Minus className="w-3 h-3 text-zinc-300" />
        </button>
        <div className="min-w-[3.5rem] text-center">
          <span className="text-sm font-semibold text-zinc-100 font-mono">
            {value}
          </span>
          <span className="text-xs text-zinc-500 ml-1">{unit}</span>
        </div>
        <button
          type="button"
          onClick={inc}
          className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-all active:scale-95"
        >
          <Plus className="w-3 h-3 text-zinc-300" />
        </button>
      </div>
    </div>
  );
}
