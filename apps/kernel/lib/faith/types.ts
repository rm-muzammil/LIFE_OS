export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameAr: string;
  dayName: string;
  formatted: string;
  formattedAr: string;
  source: 'api' | 'calculated' | 'manual';
}

export interface DailyGuidance {
  greeting: string;
  focusToday: string;
  weaknessAlert: string | null;
  verse: {
    arabic: string;
    translation: string;
    reference: string;
  };
  hadith: {
    text: string;
    source: string;
  };
  specialDay: string | null;
  actionItems: string[];
  generatedAt: string;
}

export interface FaithReportDetails {
  salah: number;
  onTime: number;
  quranPages: number;
  adhkar: boolean;
  laIlaha: boolean;
  subhanallahi: boolean;
  tafseerDone: boolean;
  verseDone: boolean;
  surahMulk: boolean;
  surahKahf: boolean;
  islamicStudy: number;
  gazeLowered: number;
  haramFree: boolean;
  rakuNum: number;
  vocabCount: number;
  mulkDone: boolean;
  dhikrDone: boolean;
  islamicStudyMinutes: number;
}

export interface FaithReport {
  score: number;
  label: 'Faith';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: FaithReportDetails | Record<string, never>;
}
