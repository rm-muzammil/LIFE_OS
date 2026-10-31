export interface FaithScoreInput {
  date?: string | Date | null;
  fajr?: boolean | null;
  dhuhr?: boolean | null;
  asr?: boolean | null;
  maghrib?: boolean | null;
  isha?: boolean | null;
  onTime?: number | null;
  morningAdhkar?: boolean | null;
  eveningAdhkar?: boolean | null;
  dhikrMinutes?: number | null;
  duaMinutes?: number | null;
  laIlaha?: boolean | null;
  subhanallahi?: boolean | null;
  quranPages?: number | null;
  tadabburMinutes?: number | null;
  tafseerDone?: boolean | null;
  tajweedConfidence?: number | null;
  verseDone?: boolean | null;
  islamicStudyMinutes?: number | null;
  surahMulk?: boolean | null;
  surahKahf?: boolean | null;
  gazeLowered?: number | null;
  haramFree?: boolean | null;
}

export interface FaithScoreBreakdown {
  salahScore: number;
  onTimeScore: number;
  morningAdhkar: number;
  eveningAdhkar: number;
  dhikrScore: number;
  duaScore: number;
  laIlahaScore: number;
  subhanallahiScore: number;
  pagesScore: number;
  tadabburScore: number;
  tafseerScore: number;
  tajweedScore: number;
  verseScore: number;
  islamicScore: number;
  mulkScore: number;
  gazeScore: number;
  haramScore: number;
}

export interface FaithScoreResult {
  rawScore: number;
  dailyScore: number;
  finalScore: number;
  breakdown: FaithScoreBreakdown;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeFaithDailyScore(input: FaithScoreInput): FaithScoreResult {
  const salahScore =
    8 *
    [input.fajr, input.dhuhr, input.asr, input.maghrib, input.isha].filter(Boolean).length;
  const onTimeScore = (clamp(input.onTime ?? 0, 0, 5) / 5) * 10;
  const morningAdhkar = input.morningAdhkar ? 5 : 0;
  const eveningAdhkar = input.eveningAdhkar ? 5 : 0;
  const dhikrScore = (input.dhikrMinutes ?? 0) >= 5 ? 4 : 0;
  const duaScore = (input.duaMinutes ?? 0) > 0 ? 3 : 0;
  const laIlahaScore = input.laIlaha ? 4 : 0;
  const subhanallahiScore = input.subhanallahi ? 4 : 0;
  const pagesScore = (input.quranPages ?? 0) >= 1 ? 3 : 0;
  const tadabburScore = (input.tadabburMinutes ?? 0) >= 5 ? 2 : 0;
  const tafseerScore = input.tafseerDone ? 4 : 0;
  const tajweedScore = (clamp(input.tajweedConfidence ?? 0, 0, 5) / 5) * 3;
  const verseScore = input.verseDone ? 2 : 0;
  const islamicScore = (input.islamicStudyMinutes ?? 0) >= 15 ? 1 : 0;
  const mulkScore = input.surahMulk ? 10 : 0;
  const gazeScore = (clamp(input.gazeLowered ?? 0, 0, 5) / 5) * 3;
  const haramScore = input.haramFree ? 2 : 0;

  const breakdown: FaithScoreBreakdown = {
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
  };
  const rawScore = Object.values(breakdown).reduce((total, points) => total + points, 0);
  const dailyScore = Math.min(100, Math.round((rawScore / 105) * 100));
  const scoreDate = input.date ? new Date(input.date) : new Date();
  const finalScore =
    scoreDate.getDay() === 5 && input.surahKahf
      ? Math.min(100, dailyScore + 5)
      : dailyScore;

  return { rawScore, dailyScore, finalScore, breakdown };
}
