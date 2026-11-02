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
// Built from provinces.cachedDetails, refreshed by the internal province cron.
export interface ProvinceContext {
  slug: string;
  name: string;
  cachedScore: number | null;
  todayDone: boolean;
  streak: number;
  details: Record<string, unknown>;
  /** True if this province's cachedAt is not from today (PKT). */
  stale: boolean;
}
