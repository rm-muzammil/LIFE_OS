export interface ProvinceReportPayload {
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
