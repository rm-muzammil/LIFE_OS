// Always PKT (Asia/Karachi) — no exceptions.

export function todayPKT(): string {
  // Returns YYYY-MM-DD in PKT
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

export function nowPKT(): Date {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(s);
}

export function formatDatePKT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTimePKT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ISO week string, e.g. "2026-W28", computed against PKT wall-clock date
export function isoWeekPKT(date?: Date): string {
  const base = date ?? nowPKT();
  // Work with the PKT calendar date only (strip time zone ambiguity)
  const pktDateStr = base.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const d = new Date(pktDateStr + 'T00:00:00Z');
  // ISO week algorithm (Thursday-based)
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
  const year = new Date(firstThursday).getUTCFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/** True if the given timestamp's PKT calendar date IS today. Used to detect
 *  "this province hasn't reported yet today" regardless of hour-of-day drift,
 *  which matters on Vercel Hobby where cron only fires within an hour window. */
export function isFromToday(date: string | Date | null): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const dDatePKT = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  return dDatePKT === todayPKT();
}

export function isStale(lastPushedAt: string | Date | null, hours = 24): boolean {
  if (!lastPushedAt) return true;
  const last = typeof lastPushedAt === 'string' ? new Date(lastPushedAt) : lastPushedAt;
  const diffMs = Date.now() - last.getTime();
  return diffMs > hours * 60 * 60 * 1000;
}
