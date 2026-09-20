"use client";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  pts?: number;
}

export function ToggleRow({ label, sublabel, checked, onChange, pts }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("toggle-btn", checked && "active")}
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-medium leading-none">{label}</span>
        {sublabel && (
          <span className="text-[11px] text-zinc-500 leading-none">{sublabel}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pts !== undefined && (
          <span className="text-[10px] text-zinc-600 font-mono">{pts}pt</span>
        )}
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
            checked
              ? "bg-brand-500 text-zinc-950"
              : "bg-zinc-700 text-zinc-500"
          )}
        >
          {checked ? (
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : (
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          )}
        </div>
      </div>
    </button>
  );
}
