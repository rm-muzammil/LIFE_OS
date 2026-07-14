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

export const SEED_PROVINCES = [
  { name: 'Faith', slug: 'faith', url: 'https://faithtracker.vercel.app', weight: 0.25 },
  { name: 'Personal', slug: 'personal', url: 'https://personal-app.vercel.app', weight: 0.2 },
  { name: 'Wealth', slug: 'wealth', url: 'https://wealth-app-eta.vercel.app', weight: 0.15 },
  { name: 'Roadmap', slug: 'roadmap', url: 'https://life-os-chi-ecru.vercel.app', weight: 0.15 },
  { name: 'Relationships', slug: 'relationships', url: '', weight: 0.1 },
  { name: 'Work', slug: 'work', url: '', weight: 0.1 },
] as const;
