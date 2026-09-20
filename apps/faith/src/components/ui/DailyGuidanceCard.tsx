"use client";
import { useEffect, useState } from "react";
import {
  Sparkles, RefreshCw, BookOpen, AlertTriangle,
  CheckCircle2, Star, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyGuidance } from "@/lib/guidance";

export function DailyGuidanceCard() {
  const [guidance, setGuidance] = useState<DailyGuidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function load(force = false) {
    setLoading(true);
    setError(null);
    try {
      if (force) await fetch("/api/guidance", { method: "DELETE" });
      const res = await fetch("/api/guidance");
      const data = await res.json();
      if (data.error === "no_api_key") {
        setError("Add your Gemini API key in Settings to enable daily guidance.");
      } else if (data.error) {
        setError("Could not generate guidance. Try again later.");
      } else {
        setGuidance(data);
      }
    } catch {
      setError("Failed to load guidance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card border-brand-500/20 bg-gradient-to-br from-zinc-900 to-zinc-900/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            Daily Guidance
          </span>
          {guidance && (
            <span className="text-[10px] text-zinc-600 font-mono">
              AI · Gemini
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => load(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
            title="Regenerate"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
          >
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-5/6" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-zinc-500 leading-relaxed">{error}</p>
      )}

      {/* Content */}
      {!loading && guidance && (
        <div className={cn("space-y-4", !expanded && "hidden")}>
          {/* Greeting */}
          <p className="text-sm text-zinc-300 leading-relaxed font-medium">
            {guidance.greeting}
          </p>

          {/* Special day banner */}
          {guidance.specialDay && (
            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
              <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-amber-300 leading-relaxed">{guidance.specialDay}</p>
            </div>
          )}

          {/* Weakness alert */}
          {guidance.weaknessAlert && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-red-300 leading-relaxed">{guidance.weaknessAlert}</p>
            </div>
          )}

          {/* Focus today */}
          <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
              Focus Today
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{guidance.focusToday}</p>
          </div>

          {/* Verse */}
          <div className="space-y-2 border-l-2 border-brand-500/40 pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Verse
            </p>
            <p className="arabic-text text-base text-zinc-200 leading-[2.2]" dir="rtl">
              {guidance.verse.arabic}
            </p>
            <p className="text-xs text-zinc-400 italic leading-relaxed">
              "{guidance.verse.translation}"
            </p>
            <p className="text-[10px] text-zinc-600">{guidance.verse.reference}</p>
          </div>

          {/* Hadith */}
          <div className="space-y-1.5 border-l-2 border-zinc-600/40 pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Hadith
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed italic">
              "{guidance.hadith.text}"
            </p>
            <p className="text-[10px] text-zinc-600">{guidance.hadith.source}</p>
          </div>

          {/* Action items */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Today's Actions
            </p>
            <div className="space-y-1.5">
              {guidance.actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-xs text-zinc-400 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer timestamp */}
          <p className="text-[10px] text-zinc-700 text-right">
            Generated {new Date(guidance.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}

      {/* Collapsed preview */}
      {!loading && guidance && !expanded && (
        <p className="text-xs text-zinc-500 truncate">{guidance.focusToday}</p>
      )}
    </div>
  );
}