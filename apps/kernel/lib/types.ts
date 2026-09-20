export interface ProvinceReportPayload {
  userId: string;
  score: number;
  label: string;
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details?: Record<string, unknown>;
}

export interface ProvinceWithMeta {
  id: string;
  name: string;
  slug: string;
  url: string;
  weight: number;
  active: boolean;
  cachedScore: number | null;
  cachedDetails: unknown;
  cachedAt: string | null;
  lastPushedAt: string | null;
  lastPulledAt: string | null;
  createdAt: string;
  streak?: number;
  todayDone?: boolean;
  stale: boolean;
}

export const SEED_PROVINCES = [
  { name: 'Faith', slug: 'faith', url: 'https://faithtracker.vercel.app', weight: 0.25 },
  { name: 'Personal', slug: 'personal', url: 'https://personal-app.vercel.app', weight: 0.2 },
  { name: 'Wealth', slug: 'wealth', url: 'https://wealth-app-eta.vercel.app', weight: 0.15 },
  { name: 'Roadmap', slug: 'roadmap', url: 'https://life-os-chi-ecru.vercel.app', weight: 0.15 },
  { name: 'Relationships', slug: 'relationships', url: '', weight: 0.1 },
  { name: 'Work', slug: 'work', url: '', weight: 0.1 },
] as const;

// ─────────────────────────────────────────────────────────────
// AI Scheduler + Chat
// ─────────────────────────────────────────────────────────────

export type TaskProvince =
  | 'faith'
  | 'personal'
  | 'work'
  | 'roadmap'
  | 'wealth'
  | 'relationships'
  | 'sk';

export type TaskType = 'prayer' | 'sunnah' | 'task' | 'review' | 'deep-work';

export type TaskStatus = 'pending' | 'done' | 'missed' | 'rescheduled';

export interface ScheduledTask {
  id: string; // uuid
  time: string; // "05:30" PKT 24h
  timeLabel: string; // "Fajr" | "Before Dhuhr" | "After Asr" etc
  province: TaskProvince;
  title: string; // "Pray Fajr"
  description: string; // short detail
  priority: number; // 1 = highest
  type: TaskType;
  status: TaskStatus;
  originalTime: string | null; // if rescheduled
  visibleAfter: string; // show only after this PKT time
  hideAfter: string | null; // null = never hide
  notifyAt: string; // PKT time to fire notification
}

export interface PrayerTimesConfig {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

// Chat API shapes
export interface ChatMessagePayload {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  date: string;
  feedsSchedule: boolean;
  createdAt: string;
}

// Minimal per-province context handed to the Gemini prompt.
// Built from provinces.cachedDetails (already pulled by the existing
// pull-provinces cron) — the scheduler never talks to province apps directly.
export interface ProvinceContext {
  slug: string;
  name: string;
  cachedScore: number | null;
  todayDone: boolean;
  streak: number;
  details: Record<string, unknown>;
  /** True if this province's cachedAt is not from today (PKT) — its last
   *  successful pull was some earlier day, so today's status is unknown. */
  stale: boolean;
}
