"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdhkarItem } from "@/lib/adhkar";
import { DhikrCounter } from "./DhikrCounter";

interface Props {
  title: string;
  titleAr: string;
  items: AdhkarItem[];
  date: string;
  counts: Record<string, { count: number; completed: boolean }>;
  onAllDone?: () => void;
  defaultOpen?: boolean;
}

export function AdhkarSection({ title, titleAr, items, date, counts, onAllDone, defaultOpen }: Props) {
const [open, setOpen] = useState(defaultOpen ?? false);

  const doneCount = items.filter((item) => {
    const c = counts[item.key];
    return c ? c.completed || c.count >= item.count : false;
  }).length;
  const allDone = doneCount === items.length;

  return (
    <div className={cn("card transition-all", allDone && "border-brand-500/20 bg-brand-500/5")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          {allDone
            ? <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
            : <Circle className="w-5 h-5 text-zinc-600 shrink-0" />}
          <div className="text-left">
            <p className={cn("text-sm font-semibold", allDone ? "text-brand-300" : "text-zinc-200")}>
              {title}
            </p>
            <p className="text-[10px] text-zinc-500 arabic-text" dir="rtl">{titleAr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">{doneCount}/{items.length}</span>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4 animate-slide-up">
          {items.map((item) => {
            const c = counts[item.key];
            const isHighCount = item.count >= 10;
            return isHighCount ? (
              <DhikrCounter
                key={item.key}
                dhikrKey={item.key}
                arabic={item.arabic}
                transliteration={item.transliteration}
                translation={item.translation}
                target={item.count}
                benefit={item.benefit}
                date={date}
                initialCount={c?.count ?? 0}
                initialCompleted={c?.completed ?? false}
              />
            ) : (
              <SimpleAdhkarItem
                key={item.key}
                item={item}
                date={date}
                initialCompleted={c?.completed ?? false}
                initialCount={c?.count ?? 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SimpleAdhkarItem({
  item, date, initialCompleted, initialCount,
}: {
  item: AdhkarItem;
  date: string;
  initialCompleted: boolean;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [completed, setCompleted] = useState(initialCompleted);

  async function tap() {
    if (completed) return;
    const next = count + 1;
    setCount(next);
    const done = next >= item.count;
    if (done) setCompleted(true);
    await fetch("/api/dhikr-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dhikrKey: item.key, count: next, target: item.count }),
    });
  }

  return (
    <div className={cn(
      "rounded-xl border px-3 py-3 transition-all",
      completed ? "border-brand-500/30 bg-brand-500/5" : "border-zinc-700/50 bg-zinc-800/40"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="arabic-text text-base text-zinc-200 leading-[2]" dir="rtl">
            {item.arabic}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{item.translation}</p>
          {item.benefit && (
            <p className="text-[10px] text-brand-500/70 mt-1">{item.benefit}</p>
          )}
        </div>
        <button
          onClick={tap}
          disabled={completed}
          className={cn(
            "shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95",
            completed
              ? "border-brand-500/50 bg-brand-500/20 cursor-default"
              : "border-zinc-600 bg-zinc-700 hover:border-brand-500/50 active:bg-zinc-600"
          )}
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-brand-400" />
          ) : (
            <>
              <span className="text-lg font-bold text-zinc-100 font-mono leading-none">{count}</span>
              <span className="text-[9px] text-zinc-500">/{item.count}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}