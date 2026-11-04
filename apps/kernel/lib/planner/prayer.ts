import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { prayerTimes } from '@/db/schema';
import { isPlannerDate, weekdayForDate } from '@/lib/planner/time';
import {
  DEFAULT_PLANNER_SETTINGS,
  type PlannerSettings,
  type PrayerSource,
  type PrayerTimes,
  type PrayerTimesResult,
} from '@/lib/planner/types';
import {
  cachePrayerTimes,
  getCachedPrayerTimes,
  getPlannerSettings,
} from '@/lib/planner/repo';

const DEFAULT_PRAYER_TIMES: PrayerTimes = {
  fajr: '05:20',
  dhuhr: '13:00',
  asr: '16:45',
  maghrib: '19:30',
  isha: '21:00',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

interface AladhanPayload {
  data?: {
    timings?: Partial<Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string>>;
  };
}

interface PrayerCandidate {
  times: PrayerTimes;
  source: PrayerSource;
}

export function isPrayerTimes(value: unknown): value is PrayerTimes {
  if (typeof value !== 'object' || value === null) return false;
  const times = value as Record<string, unknown>;
  return PRAYER_KEYS.every((key) => {
    const time = times[key];
    return typeof time === 'string' && TIME_PATTERN.test(time);
  });
}

function validCandidate(value: unknown, source: PrayerSource): PrayerCandidate | null {
  return isPrayerTimes(value) ? { times: value, source } : null;
}

export async function resolvePrayerTimes(
  params: {
    settings: PlannerSettings;
    cached: { times: unknown; source: PrayerSource } | null;
    manual: unknown;
  },
  fetchAuto: () => Promise<unknown>
): Promise<PrayerCandidate> {
  const automaticConfigured =
    params.settings.prayerAuto &&
    Boolean(params.settings.prayerCity?.trim()) &&
    Boolean(params.settings.prayerCountry?.trim());

  if (automaticConfigured && params.cached?.source === 'auto') {
    const cachedAuto = validCandidate(params.cached.times, 'auto');
    if (cachedAuto) return cachedAuto;
  }

  if (automaticConfigured) {
    try {
      const automatic = validCandidate(await fetchAuto(), 'auto');
      if (automatic) return automatic;
      console.error('Planner Aladhan response was invalid; using prayer-time fallback');
    } catch {
      console.error('Planner Aladhan lookup failed; using prayer-time fallback');
    }
  }

  const manual = validCandidate(params.manual, 'manual');
  if (manual) return manual;

  return { times: DEFAULT_PRAYER_TIMES, source: 'default' };
}

async function fetchAladhanTimes(
  date: string,
  settings: PlannerSettings
): Promise<PrayerTimes | null> {
  const [year, month, day] = date.split('-');
  const requestDate = `${day}-${month}-${year}`;
  const query = new URLSearchParams({
    city: settings.prayerCity!.trim(),
    country: settings.prayerCountry!.trim(),
    method: String(settings.prayerMethod),
    school: String(settings.prayerAsrSchool),
  });
  const url = `https://api.aladhan.com/v1/timingsByCity/${requestDate}?${query.toString()}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) continue;
      const payload = (await response.json()) as AladhanPayload;
      const timings = payload.data?.timings;
      const parsed = timings
        ? Object.fromEntries(PRAYER_KEYS.map((key) => {
            const name = key[0].toUpperCase() + key.slice(1) as
              'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
            const raw = timings[name];
            const withoutSuffix = typeof raw === 'string' ? raw.trim().split(/\s+/)[0] : '';
            return [key, withoutSuffix];
          }))
        : null;
      if (isPrayerTimes(parsed)) return parsed;
    } catch {
      if (attempt === 1) console.error('Planner Aladhan request failed after retry');
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

function isFriday(date: string): boolean {
  return isPlannerDate(date) && weekdayForDate(date) === 5;
}

function defaultSettings(userId: string): PlannerSettings {
  return { ...DEFAULT_PLANNER_SETTINGS, userId };
}

export async function getPrayerTimes(userId: string, date: string): Promise<PrayerTimesResult> {
  let settings = defaultSettings(userId);
  let cached: Awaited<ReturnType<typeof getCachedPrayerTimes>> | null = null;
  let manual: PrayerTimes | null = null;

  try {
    if (!isPlannerDate(date)) {
      return { ...DEFAULT_PRAYER_TIMES, source: 'default', isFriday: false };
    }

    try {
      settings = await getPlannerSettings(userId);
    } catch {
      console.error('Planner settings lookup failed; using prayer-time fallback');
    }

    try {
      cached = await getCachedPrayerTimes(userId, date);
    } catch {
      console.error('Planner prayer cache lookup failed; using uncached prayer times');
    }

    try {
      const [row] = await db.select({
        fajr: prayerTimes.fajr,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha,
      }).from(prayerTimes)
        .where(eq(prayerTimes.userId, userId))
        .limit(1);
      manual = row && isPrayerTimes(row) ? row : null;
    } catch {
      console.error('Manual prayer-time lookup failed; using default prayer times');
    }

    const chosen = await resolvePrayerTimes({
      settings,
      cached: cached ? { times: cached, source: cached.source as PrayerSource } : null,
      manual,
    }, () => fetchAladhanTimes(date, settings));

    if (chosen.source === 'auto') {
      try {
        await cachePrayerTimes(userId, date, chosen.times, 'auto');
      } catch {
        console.error('Planner prayer cache write failed');
      }
    }

    return { ...chosen.times, source: chosen.source, isFriday: isFriday(date) };
  } catch {
    console.error('Planner prayer provider failed; using default prayer times');
    return { ...DEFAULT_PRAYER_TIMES, source: 'default', isFriday: isFriday(date) };
  }
}
