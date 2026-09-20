"use client";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface Props {
  dhikrKey: string;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  benefit?: string;
  date: string;
  initialCount?: number;
  initialCompleted?: boolean;
  colorClass?: string;
}

export function DhikrCounter({
  dhikrKey, arabic, transliteration, translation, target,
  benefit, date, initialCount = 0, initialCompleted = false,
  colorClass = "brand",
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced save — saves 800ms after last tap
  function tap() {
    if (completed) return;
    const next = count + 1;
    setCount(next);
    if (next >= target) {
      setCompleted(true);
      save(next);
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(next), 800);
  }

  async function save(c: number) {
    setSaving(true);
    try {
      await fetch("/api/dhikr-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dhikrKey, count: c, target }),
      });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!completed) return; // can't reset mid-way, only completed ones
    // Don't actually reset completed — it stays done for the day
  }

  const pct = Math.min((count / target) * 100, 100);
  const remaining = Math.max(0, target - count);

  return (
    <div className={cn(
      "card space-y-3 transition-all",
      completed && "border-brand-500/30 bg-brand-500/5"
    )}>
      {/* Arabic */}
      <div className="text-center space-y-1">
        <p className="arabic-text text-2xl text-zinc-100 leading-[2]" dir="rtl">
          {arabic}
        </p>
        <p className="text-xs text-zinc-500">{transliteration}</p>
        <p className="text-xs text-zinc-600 italic">{translation}</p>
        {benefit && (
          <p className="text-[10px] text-brand-500/80 bg-brand-500/10 rounded-full px-3 py-1 inline-block">
            {benefit}
          </p>
        )}
      </div>

      {/* Progress ring + count */}
      <div className="flex flex-col items-center gap-3">
        {/* Big tap button */}
        <button
          onClick={tap}
          disabled={completed}
          className={cn(
            "relative w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150",
            "active:scale-95 select-none",
            completed
              ? "border-brand-500 bg-brand-500/20 cursor-default"
              : "border-zinc-700 bg-zinc-800/80 hover:border-brand-500/50 hover:bg-zinc-800 active:bg-zinc-700"
          )}
          style={{
            background: completed
              ? undefined
              : `conic-gradient(rgb(34 197 94 / 0.3) ${pct * 3.6}deg, transparent 0deg)`,
          }}
        >
          {completed ? (
            <CheckCircle2 className="w-10 h-10 text-brand-400" strokeWidth={1.5} />
          ) : (
            <>
              <span className="text-3xl font-bold text-zinc-100 font-mono leading-none">
                {count}
              </span>
              <span className="text-xs text-zinc-500 mt-1">/ {target}</span>
            </>
          )}
          {saving && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          )}
        </button>

        {/* Remaining */}
        {!completed && (
          <p className="text-xs text-zinc-500">
            {remaining === 0 ? "Saving…" : `${remaining} remaining — tap to count`}
          </p>
        )}
        {completed && (
          <p className="text-sm text-brand-400 font-medium">Completed ✓</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick +10 buttons for faster counting */}
      {!completed && (
        <div className="flex gap-2 justify-center">
          {[5, 10, 25].map((n) => (
            <button
              key={n}
              onClick={() => {
                const next = Math.min(count + n, target);
                setCount(next);
                if (next >= target) {
                  setCompleted(true);
                  save(next);
                } else {
                  if (saveTimer.current) clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(() => save(next), 800);
                }
              }}
              className="btn-ghost text-xs py-1 px-3"
            >
              +{n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}