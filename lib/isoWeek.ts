// lib/isoWeek.ts
// Returns ISO week string for any date, e.g. "2025-W23"
export function toIsoWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7           // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day)  // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Parse "2025-W23" back to the Monday of that week (for display)
export function isoWeekToMonday(isoWeek: string): Date {
  const [year, w] = isoWeek.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))          // Jan 4 is always in W1
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7)
  return monday
}

export function isoWeekLabel(isoWeek: string): string {
  const monday = isoWeekToMonday(isoWeek)
  return monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}