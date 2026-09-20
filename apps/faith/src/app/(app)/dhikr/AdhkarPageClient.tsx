"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdhkarItem } from "@/lib/adhkar";
import { DhikrCounter } from "@/components/ui/DhikrCounter";

interface Props {
  title: string;
  titleAr: string;
  subtitle: string;
  items: AdhkarItem[];
  today: string;
  initialCounts: Record<string, { count: number; completed: boolean }>;
  backHref: string;
}

export function AdhkarPageClient({ title, titleAr, subtitle, items, today, initialCounts, backHref }: Props) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);

  const doneCount = items.filter((i) => {
    const c = counts[i.key];
    return c?.completed || (c?.count ?? 0) >= i.count;
  }).length;
  const allDone = doneCount === items.length;

  function onCountUpdate(key: string, count: number, completed: boolean) {
    setCounts((prev) => ({ ...prev, [key]: { count, completed } }));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(backHref)}
          className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-zinc-100">{title}</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-sm font-bold font-mono", allDone ? "text-brand-400" : "text-zinc-400")}>
            {doneCount}/{items.length}
          </p>
          {allDone && <p className="text-[10px] text-brand-500">All done ✓</p>}
        </div>
      </div>

      {/* Arabic title */}
      <div className="text-center py-2">
        <p className="arabic-text text-2xl text-zinc-300" dir="rtl">{titleAr}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      {/* Adhkar list */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const c = counts[item.key];
          const isDone = c?.completed || (c?.count ?? 0) >= item.count;

          return item.count >= 10 ? (
            <DhikrCounter
              key={item.key}
              dhikrKey={item.key}
              arabic={item.arabic}
              transliteration={item.transliteration}
              translation={item.translation}
              target={item.count}
              benefit={item.benefit}
              date={today}
              initialCount={c?.count ?? 0}
              initialCompleted={c?.completed ?? false}
            //   onUpdate={onCountUpdate}
            />
          ) : (
            <SimpleItem
              key={item.key}
              item={item}
              index={idx + 1}
              date={today}
              initialCount={c?.count ?? 0}
              initialCompleted={isDone}
              onUpdate={onCountUpdate}
            />
          );
        })}
      </div>
    </div>
  );
}

function SimpleItem({
  item, index, date, initialCount, initialCompleted, onUpdate,
}: {
  item: AdhkarItem;
  index: number;
  date: string;
  initialCount: number;
  initialCompleted: boolean;
  onUpdate: (key: string, count: number, completed: boolean) => void;
}) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(initialCompleted);

  async function tap() {
    if (done) return;
    const next = count + 1;
    setCount(next);
    const completed = next >= item.count;
    if (completed) setDone(true);
    onUpdate(item.key, next, completed);
    await fetch("/api/dhikr-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dhikrKey: item.key, count: next, target: item.count }),
    });
  }

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all",
      done ? "border-brand-500/30 bg-brand-500/5" : "border-zinc-800 bg-zinc-900"
    )}>
      <div className="flex gap-3">
        {/* Index */}
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold mt-1",
          done ? "bg-brand-500/20 text-brand-400" : "bg-zinc-800 text-zinc-500"
        )}>
          {done ? <CheckCircle2 className="w-4 h-4" /> : index}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="arabic-text text-lg text-zinc-100 leading-[2.2]" dir="rtl">
            {item.arabic}
          </p>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.translation}</p>
          {item.benefit && (
            <p className="text-[10px] text-brand-500/70 mt-1.5 bg-brand-500/10 rounded-lg px-2 py-1 inline-block">
              {item.benefit}
            </p>
          )}
        </div>

        {/* Counter button */}
        <button
          onClick={tap}
          disabled={done}
          className={cn(
            "shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 self-center",
            done
              ? "border-brand-500/40 bg-brand-500/15 cursor-default"
              : "border-zinc-700 bg-zinc-800 hover:border-brand-500/50 active:bg-zinc-700"
          )}
        >
          {done ? (
            <CheckCircle2 className="w-5 h-5 text-brand-400" />
          ) : (
            <>
              <span className="text-lg font-bold text-zinc-100 font-mono leading-none">{count}</span>
              <span className="text-[9px] text-zinc-500 mt-0.5">/{item.count}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}