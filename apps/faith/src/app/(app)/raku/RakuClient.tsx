// src/app/(app)/raku/RakuClient.tsx
"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/StarRating";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { RakuProgress } from "@/db/schema";

interface Props {
  progress: RakuProgress[];
  currentRaku: number;
  totalVocab: number;
}

type RakuState = {
  tafseerDone: boolean;
  tajweedConfidence: number;
  vocabExtracted: boolean;
  notes: string;
};

export function RakuClient({ progress, currentRaku, totalVocab }: Props) {
  const router = useRouter();

  const [expanded, setExpanded] = useState<number | null>(currentRaku);

  // Local edits — what the user has changed since last save
  const [localEdits, setLocalEdits] = useState<Record<number, Partial<RakuState>>>({});

  // Track optimistically completed rakus (completedAt set)
const [optimisticCompleted, setOptimisticCompleted] = useState<Set<number>>(
  () => new Set(
    progress
      .filter((p) => p.tafseerDone && p.tajweedConfidence > 0 && p.vocabExtracted)
      .map((p) => p.rakuNumber)
  )
);

// Reset when server sends fresh data (e.g. after DB clear)
useEffect(() => {
  setOptimisticCompleted(new Set(
    progress
      .filter((p) => p.tafseerDone && p.tajweedConfidence > 0 && p.vocabExtracted)
      .map((p) => p.rakuNumber)
  ));
  setLocalEdits({});
  setExpanded(currentRaku);
}, [progress.length, currentRaku]);

  // Server state map
  const serverMap = new Map(progress.map((p) => [p.rakuNumber, p]));

  // Merged state: server data + local edits
  function getState(n: number): RakuState {
    const server = serverMap.get(n);
    const edits = localEdits[n] ?? {};
    return {
      tafseerDone:       edits.tafseerDone      ?? server?.tafseerDone      ?? false,
      tajweedConfidence: edits.tajweedConfidence ?? server?.tajweedConfidence ?? 0,
      vocabExtracted:    edits.vocabExtracted    ?? server?.vocabExtracted    ?? false,
      notes:             edits.notes             ?? server?.notes             ?? "",
    };
  }

  function patch(n: number, updates: Partial<RakuState>) {
    setLocalEdits((prev) => ({
      ...prev,
      [n]: { ...(prev[n] ?? {}), ...updates },
    }));
  }

  async function saveRaku(n: number) {
    const s = getState(n);

    // Merge with server data — once true always true
    const server = serverMap.get(n);
    const finalTafseer  = !!(server?.tafseerDone    || s.tafseerDone);
    const finalTajweed  = Math.max(server?.tajweedConfidence ?? 0, s.tajweedConfidence);
    const finalVocab    = !!(server?.vocabExtracted  || s.vocabExtracted);
    const allDone = finalTafseer && finalTajweed > 0 && finalVocab;

    const res = await fetch("/api/raku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rakuNumber: n,
        tafseerDone: s.tafseerDone,
        tajweedConfidence: s.tajweedConfidence,
        vocabExtracted: s.vocabExtracted,
        notes: s.notes,
      }),
    });

    if (!res.ok) {
      toast.error("Save failed");
      return;
    }

    // Clear local edits for this raku — server is now source of truth
    setLocalEdits((prev) => {
      const next = { ...prev };
      delete next[n];
      return next;
    });

    if (allDone) {
      setOptimisticCompleted((prev) => {
        const next = new Set(Array.from(prev));
        next.add(n);
        return next;
      });
      toast.success(`Raku ${n} complete! Moving to next.`);
      setExpanded(n + 1);
    } else {
      const remaining = [
        !finalTafseer  && "Tafseer",
        !(finalTajweed > 0) && "Tajweed rating",
        !finalVocab    && "Vocab extracted",
      ].filter(Boolean).join(", ");
      toast.success(`Saved. Still needed: ${remaining}`);
    }

    // Refresh server data
    router.refresh();
  }

  // Current raku from optimistic set
  const localCurrentRaku = (() => {
    for (let i = 1; i <= 558; i++) {
      if (!optimisticCompleted.has(i)) return i;
    }
    return 558;
  })();

  const completedCount = optimisticCompleted.size;

  // Visible rakus: all completed + window around current
  const visibleNums = new Set<number>();
  Array.from(optimisticCompleted).forEach((n) => visibleNums.add(n));
  for (let i = Math.max(1, localCurrentRaku - 2); i <= Math.min(558, localCurrentRaku + 8); i++) {
    visibleNums.add(i);
  }
  const sorted = Array.from(visibleNums).sort((a, b) => a - b);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Dr Israr Ahmad</p>
        <h1 className="text-xl font-bold text-zinc-100">Raku Tracker</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {([
          ["Completed", completedCount, "/558"],
          ["Current", `#${localCurrentRaku}`, ""],
          ["Vocab", totalVocab, "words"],
        ] as [string, string | number, string][]).map(([label, val, sub]) => (
          <div key={label} className="card text-center">
            <p className="text-xl font-bold text-zinc-100">{val}</p>
            {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-300">Tafseer Progress</span>
          <span className="text-xs font-mono text-brand-400">{completedCount}/558</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700"
            style={{ width: `${(completedCount / 558) * 100}%` }}
          />
        </div>
      </div>

      {/* Criteria reminder */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-xs text-zinc-500 leading-relaxed">
        Complete when all 3 done:{" "}
        <span className="text-brand-400">Tafseer ✓</span>
        {" · "}
        <span className="text-brand-400">Tajweed rated ✓</span>
        {" · "}
        <span className="text-brand-400">Vocab extracted ✓</span>
        <br />
        <span className="text-zinc-600">Criteria are cumulative — save each separately if needed.</span>
      </div>

      {/* Raku list */}
      <div className="space-y-2">
        {sorted.map((n) => {
          const state = getState(n);
          const server = serverMap.get(n);

          // Effective state = merge of server + local
          const effectiveTafseer  = !!(server?.tafseerDone    || state.tafseerDone);
          const effectiveTajweed  = Math.max(server?.tajweedConfidence ?? 0, state.tajweedConfidence);
          const effectiveVocab    = !!(server?.vocabExtracted  || state.vocabExtracted);
          const isComplete = optimisticCompleted.has(n) || (effectiveTafseer && effectiveTajweed > 0 && effectiveVocab);
          const isCurrent  = n === localCurrentRaku;
          const isExpanded = expanded === n;
          const criteriaCount = [effectiveTafseer, effectiveTajweed > 0, effectiveVocab].filter(Boolean).length;

          return (
            <div
              key={n}
              className={cn(
                "card transition-all",
                isCurrent  && "border-brand-500/30 bg-brand-500/5",
                isComplete && !isCurrent && "opacity-60"
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : n)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
                  ) : (
                    <Circle className={cn("w-5 h-5 shrink-0", isCurrent ? "text-brand-500" : "text-zinc-600")} />
                  )}
                  <div className="text-left">
                    <p className={cn("text-sm font-semibold", isCurrent ? "text-brand-300" : "text-zinc-200")}>
                      Raku {n}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-400 rounded-full px-2 py-0.5">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      {isComplete
                        ? `Complete · tajweed ${effectiveTajweed}/5`
                        : `${criteriaCount}/3 criteria met`}
                    </p>
                  </div>
                </div>

                {/* T / J / V pills */}
                {!isComplete && (
                  <div className="flex gap-1 mr-2">
                    {[
                      { done: effectiveTafseer,    label: "T" },
                      { done: effectiveTajweed > 0, label: "J" },
                      { done: effectiveVocab,       label: "V" },
                    ].map(({ done, label }) => (
                      <span
                        key={label}
                        className={cn(
                          "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                          done ? "bg-brand-500/30 text-brand-400" : "bg-zinc-800 text-zinc-600"
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {isExpanded
                  ? <ChevronUp  className="w-4 h-4 text-zinc-500 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4 animate-slide-up">
                  <ToggleRow
                    label="Tafseer Watched"
                    sublabel={effectiveTafseer && !state.tafseerDone ? "Already saved ✓" : "Dr Israr — this raku"}
                    checked={effectiveTafseer}
                    onChange={(v) => !effectiveTafseer && patch(n, { tafseerDone: v })}
                  />
                  <StarRating
                    label="Tajweed Confidence"
                    sublabel="Rate your recitation of this raku"
                    value={effectiveTajweed || state.tajweedConfidence}
                    max={5}
                    onChange={(v) => patch(n, { tajweedConfidence: v })}
                  />
                  <ToggleRow
                    label="Vocab Extracted"
                    sublabel={effectiveVocab && !state.vocabExtracted ? "Already saved ✓" : "Words added to vocab bank"}
                    checked={effectiveVocab}
                    onChange={(v) => !effectiveVocab && patch(n, { vocabExtracted: v })}
                  />
                  <textarea
                    placeholder="Notes (optional)…"
                    value={state.notes}
                    onChange={(e) => patch(n, { notes: e.target.value })}
                    className="pill-input resize-none h-20 text-xs"
                  />

                  {!isComplete && (
                    <p className="text-[11px] text-zinc-600">
                      Still needed:{" "}
                      {[
                        !effectiveTafseer        && "Tafseer",
                        !(effectiveTajweed > 0)  && "Tajweed rating",
                        !effectiveVocab          && "Vocab extracted",
                      ].filter(Boolean).join(", ") || "Nothing — save to complete!"}
                    </p>
                  )}

                  <button
                    onClick={() => saveRaku(n)}
                    className={cn("w-full", criteriaCount === 3 ? "btn-primary" : "btn-ghost")}
                  >
                    {criteriaCount === 3
                      ? `Save & Complete Raku ${n} ✓`
                      : `Save Raku ${n} (${criteriaCount}/3)`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}