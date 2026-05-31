"use client";
// app/quran/raku/page.tsx

import { useState, useEffect, useCallback } from "react";
import { getSurahForRaku, getRakuWithinSurah, TOTAL_RAKU } from "@/lib/quranData";

interface RakuData {
  currentRaku: number;
  totalRaku: number;
  percentComplete: string;
  streak: number;
  progress: {
    rakuNum: number;
    tafseerdone: boolean;
    tajweedConfidence: number | null;
    vocabPasted: boolean;
    completedAt: string | null;
  } | null;
}

const CONFIDENCE_LABELS = ["", "Shaky", "Basic", "Good", "Solid", "Mastered"];
const CONFIDENCE_COLORS = [
  "",
  "text-red-400",
  "text-orange-400",
  "text-yellow-400",
  "text-green-400",
  "text-emerald-400",
];

export default function RakuPage() {
  const [data, setData] = useState<RakuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for current raku's three checks
  const [tafseerDone, setTafseerDone] = useState(false);
  const [tajweedConf, setTajweedConf] = useState<number | null>(null);
  const [vocabPasted, setVocabPasted] = useState(false);
  const [vocabText, setVocabText] = useState("");
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [parsedVocab, setParsedVocab] = useState<
    { word: string; root: string; meaning: string }[]
  >([]);
  const [justCompleted, setJustCompleted] = useState(false);

  const fetchRaku = useCallback(async () => {
    const res = await fetch("/api/raku");
    const json = await res.json();
    setData(json);
    if (json.progress) {
      setTafseerDone(json.progress.tafseerdone);
      setTajweedConf(json.progress.tajweedConfidence);
      setVocabPasted(json.progress.vocabPasted);
    } else {
      setTafseerDone(false);
      setTajweedConf(null);
      setVocabPasted(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRaku();
  }, [fetchRaku]);

  const save = async (patch: Record<string, unknown>) => {
    if (!data) return;
    setSaving(true);
    await fetch("/api/raku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rakuNum: data.currentRaku, ...patch }),
    });
    setSaving(false);
    await fetchRaku();
  };

  const handleTafseer = async () => {
    const next = !tafseerDone;
    setTafseerDone(next);
    await save({
      tafseerdone: next,
      tajweedConfidence: tajweedConf,
      vocabPasted,
    });
  };

  const handleTajweed = async (conf: number) => {
    setTajweedConf(conf);
    await save({ tafseerdone: tafseerDone, tajweedConfidence: conf, vocabPasted });
  };

  const handleVocabParse = () => {
    // Parse pasted text: each line: arabic | root | meaning
    const lines = vocabText.split("\n").filter((l) => l.trim());
    const words = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        word: parts[0] || "",
        root: parts[1] || "",
        meaning: parts[2] || "",
      };
    });
    setParsedVocab(words.filter((w) => w.word && w.meaning));
  };

  const handleVocabSave = async () => {
    if (!data || parsedVocab.length === 0) return;
    setSaving(true);
    await fetch("/api/vocab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        words: parsedVocab.map((w) => ({
          ...w,
          firstSeenRaku: data.currentRaku,
        })),
      }),
    });
    setVocabPasted(true);
    setShowVocabModal(false);
    setVocabText("");
    setParsedVocab([]);
    await save({ tafseerdone: tafseerDone, tajweedConfidence: tajweedConf, vocabPasted: true });
    setSaving(false);
  };

  const allDone = tafseerDone && tajweedConf !== null && vocabPasted;

  const handleAdvance = async () => {
    if (!allDone || !data) return;
    setJustCompleted(true);
    await save({ tafseerdone: tafseerDone, tajweedConfidence: tajweedConf, vocabPasted });
    setTimeout(() => {
      setJustCompleted(false);
      fetchRaku();
    }, 1500);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const surah = getSurahForRaku(data.currentRaku);
  const withinSurah = getRakuWithinSurah(data.currentRaku);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
          Raku Tracker · Dr. Israr Ahmed Method
        </p>
        <h1 className="text-2xl font-bold text-zinc-100">
          Raku {data.currentRaku}{" "}
          <span className="text-green-500">of {data.totalRaku}</span>
        </h1>
        {surah && (
          <p className="text-zinc-400 text-sm mt-0.5">
            {surah.name} — Ruku {withinSurah} of {surah.rakuCount}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{data.percentComplete}% of Quran complete</span>
          <span>🔥 {data.streak} raku streak</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${data.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Three tasks */}
      <div className="space-y-3">
        {/* 1. Tafseer */}
        <div
          className={`rounded-xl border p-4 flex items-start gap-4 transition-colors cursor-pointer
            ${tafseerDone ? "border-green-500/40 bg-green-500/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}
          onClick={handleTafseer}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
              ${tafseerDone ? "border-green-500 bg-green-500" : "border-zinc-600"}`}
          >
            {tafseerDone && (
              <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-zinc-100 text-sm">Dr. Israr Tafseer Watched</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Watch the tafseer lecture for this ruku before marking done
            </p>
          </div>
        </div>

        {/* 2. Tajweed confidence */}
        <div
          className={`rounded-xl border p-4 space-y-3 transition-colors
            ${tajweedConf !== null ? "border-green-500/40 bg-green-500/5" : "border-zinc-800 bg-zinc-900"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                ${tajweedConf !== null ? "border-green-500 bg-green-500" : "border-zinc-600"}`}
            >
              {tajweedConf !== null && (
                <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-zinc-100 text-sm">Tajweed Confidence</p>
              {tajweedConf !== null && (
                <p className={`text-xs ${CONFIDENCE_COLORS[tajweedConf]}`}>
                  {CONFIDENCE_LABELS[tajweedConf]}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pl-9">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleTajweed(n)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${tajweedConf === n
                    ? "bg-green-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 pl-9">1 = Shaky · 5 = Mastered</p>
        </div>

        {/* 3. Vocab paste */}
        <div
          className={`rounded-xl border p-4 transition-colors
            ${vocabPasted ? "border-green-500/40 bg-green-500/5" : "border-zinc-800 bg-zinc-900"}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                ${vocabPasted ? "border-green-500 bg-green-500" : "border-zinc-600"}`}
            >
              {vocabPasted && (
                <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-100 text-sm">Vocab Extraction</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Paste words extracted from this ruku (Arabic | Root | Meaning)
              </p>
            </div>
            {!vocabPasted && (
              <button
                onClick={() => setShowVocabModal(true)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Add Words
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advance button */}
      {allDone && (
        <button
          onClick={handleAdvance}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
            ${justCompleted
              ? "bg-green-400 text-zinc-950"
              : "bg-green-500 hover:bg-green-400 text-zinc-950"}`}
        >
          {justCompleted ? "✓ Raku Complete! Advancing…" : "Complete & Advance to Next Raku →"}
        </button>
      )}

      {!allDone && (
        <p className="text-center text-xs text-zinc-600">
          Complete all 3 tasks above to advance to the next raku
        </p>
      )}

      {/* Vocab Modal */}
      {showVocabModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Paste Vocab Words</h2>
            <p className="text-xs text-zinc-500">
              One word per line. Format:{" "}
              <span className="font-mono text-zinc-400">Arabic | Root | Meaning</span>
              <br />
              Root and meaning are optional if you separate with |
            </p>
            <p className="text-xs text-zinc-600 font-mono bg-zinc-800 rounded p-2">
              كَتَبَ | ك ت ب | to write
              <br />
              عَلِمَ | ع ل م | to know
            </p>
            <textarea
              className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100
                placeholder:text-zinc-600 resize-none focus:outline-none focus:border-green-500/50
                font-mono leading-relaxed"
              placeholder={"كَتَبَ | ك ت ب | to write\nعَلِمَ | ع ل م | to know"}
              value={vocabText}
              onChange={(e) => setVocabText(e.target.value)}
              dir="auto"
            />
            <button
              onClick={handleVocabParse}
              className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
            >
              Preview ({vocabText.split("\n").filter((l) => l.trim()).length} lines)
            </button>

            {parsedVocab.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {parsedVocab.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs bg-zinc-800 rounded-lg px-3 py-1.5"
                  >
                    <span className="font-amiri text-base text-zinc-100" dir="rtl">
                      {w.word}
                    </span>
                    {w.root && (
                      <span className="text-zinc-500 font-amiri" dir="rtl">{w.root}</span>
                    )}
                    <span className="text-zinc-400 ml-auto">{w.meaning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowVocabModal(false);
                  setVocabText("");
                  setParsedVocab([]);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVocabSave}
                disabled={parsedVocab.length === 0 || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-400
                  text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save {parsedVocab.length} Words
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}