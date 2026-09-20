"use client";
import { useEffect, useState } from "react";
import { BookMarked, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerseData } from "@/lib/quran";

export function DailyVerseCard() {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/verse");
      if (res.ok) setVerse(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card border-brand-500/20 bg-brand-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-brand-400" strokeWidth={1.75} />
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            Today's Verse
          </span>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-3/4 ml-auto" />
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-2/3" />
        </div>
      ) : verse ? (
        <div className="space-y-3">
          <p
            className="arabic-text text-xl text-zinc-100 leading-[2.2]"
            dir="rtl"
          >
            {verse.arabic}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed italic">
            "{verse.translation}"
          </p>
          <p className="text-xs text-zinc-600">
            {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Verse unavailable offline — will load when connected.
        </p>
      )}
    </div>
  );
}
