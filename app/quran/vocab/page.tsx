"use client";
// app/quran/vocab/page.tsx

import { useState, useEffect, useCallback } from "react";

interface VocabWord {
  id: number;
  word: string;
  root: string | null;
  meaning: string;
  firstSeenRaku: number;
  status: "new" | "familiar" | "known";
  createdAt: string;
}

interface VocabResponse {
  words: VocabWord[];
  counts: { new: number; familiar: number; known: number; total: number };
}

const STATUS_CONFIG = {
  new: { label: "New", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  familiar: { label: "Familiar", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  known: { label: "Known", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
};

const STATUS_CYCLE: Record<string, "new" | "familiar" | "known"> = {
  new: "familiar",
  familiar: "known",
  known: "new",
};

export default function VocabPage() {
  const [data, setData] = useState<VocabResponse | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "familiar" | "known">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const fetchVocab = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/vocab?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    fetchVocab();
  }, [fetchVocab]);

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/vocab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchVocab();
  };

  const deleteWord = async (id: number) => {
    await fetch(`/api/vocab?id=${id}`, { method: "DELETE" });
    fetchVocab();
  };

  const words = data?.words ?? [];
  const counts = data?.counts ?? { new: 0, familiar: 0, known: 0, total: 0 };

  // Quiz mode
  const quizWords = words.filter((w) => w.status !== "known");
  const currentQuizWord = quizWords[quizIdx % Math.max(quizWords.length, 1)];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Vocab Bank · المفردات
          </p>
          <h1 className="text-2xl font-bold text-zinc-100">
            {counts.total} Words
          </h1>
        </div>
        <button
          onClick={() => {
            setQuizMode(!quizMode);
            setQuizIdx(0);
            setRevealed(false);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${quizMode ? "bg-green-500 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
        >
          {quizMode ? "Exit Quiz" : "Quiz Me"}
        </button>
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-3 gap-2">
        {(["new", "familiar", "known"] as const).map((s) => (
          <div key={s} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${STATUS_CONFIG[s].color}`}>{counts[s]}</p>
            <p className="text-xs text-zinc-500">{STATUS_CONFIG[s].label}</p>
          </div>
        ))}
      </div>

      {/* Quiz Mode */}
      {quizMode && quizWords.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <p className="text-xs text-zinc-500 text-center">
            Word {(quizIdx % quizWords.length) + 1} of {quizWords.length} to review
          </p>
          <div className="text-center">
            <p
              className="text-5xl text-zinc-100 font-bold leading-relaxed"
              style={{ fontFamily: "Amiri, serif" }}
              dir="rtl"
            >
              {currentQuizWord.word}
            </p>
            {currentQuizWord.root && (
              <p className="text-zinc-500 text-sm mt-1" dir="rtl">
                جذر: {currentQuizWord.root}
              </p>
            )}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
            >
              Reveal Meaning
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-zinc-100 font-medium">{currentQuizWord.meaning}</p>
              <p className="text-center text-xs text-zinc-600">
                First seen: Raku {currentQuizWord.firstSeenRaku}
              </p>
              <div className="flex gap-2">
                {(["new", "familiar", "known"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStatus(currentQuizWord.id, s);
                      setQuizIdx((i) => i + 1);
                      setRevealed(false);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                      ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + Filter */}
      {!quizMode && (
        <>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Arabic, root, or meaning…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100
                placeholder:text-zinc-600 focus:outline-none focus:border-green-500/50"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "new", "familiar", "known"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                  ${filter === f
                    ? "bg-green-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
              >
                {f === "all" ? `All (${counts.total})` : `${STATUS_CONFIG[f].label} (${counts[f]})`}
              </button>
            ))}
          </div>

          {/* Word list */}
          <div className="space-y-2">
            {words.length === 0 && (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-4xl mb-3" style={{ fontFamily: "Amiri, serif" }}>
                  لا توجد كلمات
                </p>
                <p className="text-sm">No words yet — add vocab from the Raku tracker</p>
              </div>
            )}
            {words.map((w) => (
              <div
                key={w.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4
                  hover:border-zinc-700 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-2xl text-zinc-100"
                      style={{ fontFamily: "Amiri, serif" }}
                      dir="rtl"
                    >
                      {w.word}
                    </span>
                    {w.root && (
                      <span
                        className="text-sm text-zinc-500"
                        style={{ fontFamily: "Amiri, serif" }}
                        dir="rtl"
                      >
                        ({w.root})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-0.5">{w.meaning}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Raku {w.firstSeenRaku}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(w.id, STATUS_CYCLE[w.status])}
                    className={`px-2.5 py-1 rounded-lg text-xs border font-medium transition-all
                      ${STATUS_CONFIG[w.status].bg} ${STATUS_CONFIG[w.status].color}`}
                  >
                    {STATUS_CONFIG[w.status].label}
                  </button>
                  <button
                    onClick={() => deleteWord(w.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400
                      transition-all text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}