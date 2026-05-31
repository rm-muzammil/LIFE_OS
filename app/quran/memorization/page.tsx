"use client";
// app/quran/memorization/page.tsx

import { useState, useEffect } from "react";
import { SURAH_RUKU_MAP } from "@/lib/quranData";

interface MemorizationData {
  today: {
    logDate: string;
    verseIndex: number;
    surahNum: number;
    ayahNum: number;
    done: boolean;
    verse: {
      surahNum: number;
      ayahNum: number;
      arabic: string;
      transliteration: string;
      translation: string;
    };
  };
  streak: number;
  totalVerses: number;
}

export default function MemorizationPage() {
  const [data, setData] = useState<MemorizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [showTrans, setShowTrans] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [checked, setChecked] = useState(false);

const fetchData = async () => {
  try {
    const res = await fetch("/api/memorization");

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const json = await res.json();
    setData(json);
  } catch (err) {
    console.error(err);
    setData(null);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDone = async () => {
    if (!data || saving) return;
    setSaving(true);
    const next = !data.today.done;
    await fetch("/api/memorization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
    setSaving(false);
    fetchData();
  };

const surahName =
  data?.today
    ? SURAH_RUKU_MAP.find(
        (s) => s.surahNum === data.today.surahNum
      )?.name ?? ""
    : "";

if (loading || !data?.today) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const v = data.today.verse;
  const progress = Math.round(((data.today.verseIndex + 1) / data.totalVerses) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
          Daily Memorization · Juz 30 Back-to-Front
        </p>
        <h1 className="text-2xl font-bold text-zinc-100">
          {surahName}{" "}
          <span className="text-green-500">:{data.today.ayahNum}</span>
        </h1>
        <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
          <span>Verse {data.today.verseIndex + 1} of {data.totalVerses}</span>
          <span>🔥 {data.streak} day streak</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-600">
          <span>{progress}% of Juz 30</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Verse card */}
      <div className={`rounded-2xl border p-6 space-y-5 transition-colors
        ${data.today.done ? "border-green-500/40 bg-green-500/5" : "border-zinc-800 bg-zinc-900"}`}>

        {/* Arabic */}
        <div className="text-center">
          <p
            className="text-3xl sm:text-4xl leading-[2.2] text-zinc-100"
            style={{ fontFamily: "Amiri, serif" }}
            dir="rtl"
          >
            {v.arabic}
          </p>
        </div>

        {/* Toggle buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setShowTranslit(!showTranslit)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all
              ${showTranslit ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
          >
            Transliteration
          </button>
          <button
            onClick={() => setShowTrans(!showTrans)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all
              ${showTrans ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
          >
            Translation
          </button>
        </div>

        {showTranslit && (
          <div className="text-center border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400 italic">{v.transliteration}</p>
          </div>
        )}

        {showTrans && (
          <div className={`text-center ${showTranslit ? "" : "border-t border-zinc-800 pt-4"}`}>
            <p className="text-sm text-zinc-300">{v.translation}</p>
          </div>
        )}
      </div>

      {/* Practice mode */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Practice Recall</p>
          <button
            onClick={() => {
              setPracticeMode(!practiceMode);
              setUserInput("");
              setChecked(false);
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {practiceMode ? "Hide" : "Try it"}
          </button>
        </div>

        {practiceMode && (
          <>
            <p className="text-xs text-zinc-600">
              Type the verse from memory, then check yourself
            </p>
            <textarea
              className="w-full h-20 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm
                text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none
                focus:border-green-500/50 font-amiri"
              placeholder="اكتب الآية من الذاكرة…"
              value={userInput}
              onChange={(e) => { setUserInput(e.target.value); setChecked(false); }}
              dir="rtl"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setChecked(true)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs text-zinc-300 transition-colors"
              >
                Reveal & Compare
              </button>
            </div>
            {checked && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-zinc-500">Correct answer:</p>
                <p
                  className="text-xl text-green-400 leading-[2]"
                  style={{ fontFamily: "Amiri, serif" }}
                  dir="rtl"
                >
                  {v.arabic}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mark done */}
      <button
        onClick={toggleDone}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all
          ${data.today.done
            ? "bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30"
            : "bg-green-500 hover:bg-green-400 text-zinc-950"}`}
      >
        {data.today.done ? "✓ Memorized Today" : "Mark as Memorized Today"}
      </button>

      {data.today.done && (
        <p className="text-center text-xs text-zinc-600">
          Come back tomorrow for the next verse
        </p>
      )}
    </div>
  );
}