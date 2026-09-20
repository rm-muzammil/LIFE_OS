import type { DailyLog } from "@/db/schema";

export function computeScore(log: Partial<DailyLog> & { date?: string }) {
  // ── Salah (50pts) ────────────────────────────────────────────
  const salahPrayers = [
    log.fajr,
    log.dhuhr,
    log.asr,
    log.maghrib,
    log.isha,
  ].filter(Boolean).length;
  const salahScore = salahPrayers * 8; // max 40
  const onTime = Math.min(5, Math.max(0, log.onTime ?? 0));
  const onTimeScore = (onTime / 5) * 10; // max 10

  // ── Dhikr (25pts) ────────────────────────────────────────────
  const morningAdhkar = log.morningAdhkar ? 5 : 0;
  const eveningAdhkar = log.eveningAdhkar ? 5 : 0;
  const dhikrScore = (log.dhikrMinutes ?? 0) >= 5 ? 4 : 0;
  const duaScore = (log.duaMinutes ?? 0) > 0 ? 3 : 0;
  const laIlahaScore = log.laIlaha ? 4 : 0;
  const subhanallahiScore = log.subhanallahi ? 4 : 0;

  // ── Quran (15pts) ────────────────────────────────────────────
  const pagesScore = (log.quranPages ?? 0) >= 1 ? 3 : 0;
  const tadabburScore = (log.tadabburMinutes ?? 0) >= 5 ? 2 : 0;
  const tafseerScore = log.tafseerDone ? 4 : 0;
  const tajweed = Math.min(5, Math.max(0, log.tajweedConfidence ?? 0));
  const tajweedScore = (tajweed / 5) * 3; // max 3
  const verseScore = log.verseDone ? 2 : 0;
  const islamicScore = (log.islamicStudyMinutes ?? 0) >= 15 ? 1 : 0;

  // ── Sunnah (10pts) ────────────────────────────────────────────
  const mulkScore = log.surahMulk ? 10 : 0;

  // ── Self-discipline (5pts) ────────────────────────────────────
  const gaze = Math.min(5, Math.max(0, log.gazeLowered ?? 0));
  const gazeScore = (gaze / 5) * 3; // max 3
  const haramScore = log.haramFree ? 2 : 0;

  const rawScore =
    salahScore +
    onTimeScore +
    morningAdhkar +
    eveningAdhkar +
    dhikrScore +
    duaScore +
    laIlahaScore +
    subhanallahiScore +
    pagesScore +
    tadabburScore +
    tafseerScore +
    tajweedScore +
    verseScore +
    islamicScore +
    mulkScore +
    gazeScore +
    haramScore;

  const dailyScore = Math.min(100, Math.round((rawScore / 105) * 100));

  const isFriday = (() => {
    const d = log.date ? new Date(log.date) : new Date();
    return d.getDay() === 5;
  })();

  const fridayBonus = log.surahKahf
    ? Math.min(100, dailyScore + 5)
    : dailyScore;

  const finalScore = isFriday ? fridayBonus : dailyScore;

  return {
    rawScore,
    dailyScore,
    finalScore,
    breakdown: {
      salahScore,
      onTimeScore,
      morningAdhkar,
      eveningAdhkar,
      dhikrScore,
      duaScore,
      laIlahaScore,
      subhanallahiScore,
      pagesScore,
      tadabburScore,
      tafseerScore,
      tajweedScore,
      verseScore,
      islamicScore,
      mulkScore,
      gazeScore,
      haramScore,
    },
  };
}

/** Returns true if the day qualifies for a "green" activity square */
export function isActivityGreen(log: Partial<DailyLog>) {
  const allSalah =
    log.fajr && log.dhuhr && log.asr && log.maghrib && log.isha;
  const tafseer = log.tafseerDone;
  const verse = log.verseDone;
  const dhikrFull = log.laIlaha && log.subhanallahi;
  return !!(allSalah && tafseer && verse && dhikrFull);
}
