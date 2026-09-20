"use client";
import { useState } from "react";
import { todayISO, formatDisplayDate, cn, scoreColor, scoreBg } from "@/lib/utils";
import { isFriday } from "@/lib/utils";
import { Save, Flame } from "lucide-react";
import { ActivityGrid } from "@/components/ui/ActivityGrid";
import { SalahSection } from "@/components/sections/SalahSection";
import { DhikrSection } from "@/components/sections/DhikrSection";
import { QuranSection } from "@/components/sections/QuranSection";
import { SunnahSection } from "@/components/sections/SunnahSection";
import { DisciplineSection } from "@/components/sections/DisciplineSection";
import { DailyVerseCard } from "@/components/ui/DailyVerseCard";
import { DailyGuidanceCard } from "@/components/ui/DailyGuidanceCard";
import { computeScore } from "@/lib/scoring";
import type { DailyLog } from "@/db/schema";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  existing: DailyLog | null;
  activityData: { date: string; green: boolean; score: number }[];
  streak: number;
  today: string;
  hijriFormatted: string;     // "7 Dhul Hijjah 1447"
  hijriFormattedAr: string;   // Arabic
  hijriDayName: string;       // "Wednesday"
  hijriSource: "api" | "calculated";
}

const DEFAULTS = {
  fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
  onTime: 0,
  morningAdhkar: false, eveningAdhkar: false,
  beforeSleepAdhkar: false, duaMinutes: 0,
  laIlaha: false, subhanallahi: false,
  quranPages: 0, tadabburMinutes: 0,
  tafseerDone: false, tajweedConfidence: 0,
  verseDone: false, islamicStudyMinutes: 0,
  surahMulk: false, surahKahf: false,
  gazeLowered: 0, haramFree: false,
};

type Fields = typeof DEFAULTS;

function fromExisting(e: DailyLog): Fields {
  return {
    fajr: e.fajr, dhuhr: e.dhuhr, asr: e.asr, maghrib: e.maghrib, isha: e.isha,
    onTime: e.onTime,
    morningAdhkar: e.morningAdhkar, eveningAdhkar: e.eveningAdhkar,
    beforeSleepAdhkar: e.beforeSleepAdhkar, duaMinutes: e.duaMinutes,
    laIlaha: e.laIlaha, subhanallahi: e.subhanallahi,
    quranPages: e.quranPages, tadabburMinutes: e.tadabburMinutes,
    tafseerDone: e.tafseerDone, tajweedConfidence: e.tajweedConfidence,
    verseDone: e.verseDone, islamicStudyMinutes: e.islamicStudyMinutes,
    surahMulk: e.surahMulk, surahKahf: e.surahKahf,
    gazeLowered: e.gazeLowered, haramFree: e.haramFree,
  };
}

export function DashboardClient({
  existing, activityData, streak, today,
  hijriFormatted, hijriFormattedAr, hijriDayName, hijriSource,
}: Props) {
  const friday = isFriday(today);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [fields, setFields] = useState<Fields>(
    existing ? fromExisting(existing) : { ...DEFAULTS }
  );

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const { finalScore, rawScore } = computeScore({ ...fields, date: today });

  const salahPts = Math.round(
    [fields.fajr, fields.dhuhr, fields.asr, fields.maghrib, fields.isha].filter(Boolean).length * 8
    + (Math.min(5, fields.onTime) / 5) * 10
  );
  const dhikrPts = (fields.morningAdhkar ? 5 : 0) + (fields.eveningAdhkar ? 5 : 0)
    + (fields.beforeSleepAdhkar ? 5 : 0) + (fields.duaMinutes > 0 ? 3 : 0)
    + (fields.laIlaha ? 4 : 0) + (fields.subhanallahi ? 4 : 0);
  const quranPts = Math.round(
    (fields.quranPages >= 1 ? 3 : 0) + (fields.tadabburMinutes >= 5 ? 2 : 0)
    + (fields.tafseerDone ? 4 : 0) + (Math.min(5, fields.tajweedConfidence) / 5) * 3
    + (fields.verseDone ? 2 : 0) + (fields.islamicStudyMinutes >= 15 ? 1 : 0)
  );
  const sunnahPts = fields.surahMulk ? 10 : 0;
  const disciplinePts = Math.round(
    (Math.min(5, fields.gazeLowered) / 5) * 3 + (fields.haramFree ? 2 : 0)
  );

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, ...fields }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved ✓");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">
            {formatDisplayDate(today)}
          </p>
          <h1 className="text-xl font-bold text-zinc-100">Daily Log</h1>
          {friday && (
            <span className="inline-block mt-1 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2.5 py-0.5">
              Jumu'ah — Al-Kahf bonus available
            </span>
          )}
        </div>

        {/* Score orb */}
        <div className={cn(
          "flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 shrink-0",
          scoreBg(finalScore)
        )}>
          <span className={cn("text-2xl font-bold", scoreColor(finalScore))}>{finalScore}</span>
          <span className="text-[10px] text-zinc-500 font-medium">/ 100</span>
        </div>
      </div>

      {/* ── Hijri date ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Islamic Date{hijriSource === "calculated" ? " · estimated" : ""}
          </span>
          <span className="text-sm font-medium text-zinc-300">{hijriFormatted}</span>
          <span className="text-xs text-zinc-500">{hijriDayName}</span>
        </div>
        <span className="arabic-text text-lg text-zinc-400 leading-relaxed" dir="rtl">
          {hijriFormattedAr}
        </span>
      </div>

      {/* ── Streak + save ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-zinc-200">{streak}</span>
          <span className="text-xs text-zinc-500">day streak</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 ml-auto"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ── Activity grid ──────────────────────────────────────── */}
      <div className="card">
        <p className="section-title">Activity</p>
        <ActivityGrid data={activityData} />
      </div>

      {/* ── AI Guidance ────────────────────────────────────────── */}
      <DailyGuidanceCard />

      {/* ── Daily verse ────────────────────────────────────────── */}
      <DailyVerseCard />

      {/* ── Scored sections ────────────────────────────────────── */}
      <SalahSection fields={fields} set={set} />
      <DhikrSection fields={fields} set={set} />
      <QuranSection fields={fields} set={set} />
      <SunnahSection fields={fields} set={set} isFriday={friday} />
      <DisciplineSection fields={fields} set={set} />

      {/* ── Score breakdown ────────────────────────────────────── */}
      <div className="card">
        <p className="section-title">Score Breakdown</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {([
            ["Salah", salahPts, 50],
            ["Dhikr", dhikrPts, 25],
            ["Quran", quranPts, 15],
            ["Sunnah", sunnahPts, 10],
            ["Discipline", disciplinePts, 5],
          ] as [string, number, number][]).map(([label, score, max]) => (
            <div key={label} className="bg-zinc-800/50 rounded-lg px-3 py-2">
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400 text-xs">{label}</span>
                <span className="text-zinc-300 text-xs font-mono">{score}/{max}</span>
              </div>
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${(score / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-500">Raw score</span>
          <span className="text-xs font-mono text-zinc-400">{Math.round(rawScore)}/105</span>
        </div>
      </div>
    </div>
  );
}