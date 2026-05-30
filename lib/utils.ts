import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isFriday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDisplay(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, d MMMM yyyy')
}

export function isFridayToday(): boolean {
  return isFriday(new Date())
}

// Count prayers completed out of 5
export function prayerCount(row: {
  fajr: boolean; dhuhr: boolean; asr: boolean
  maghrib: boolean; isha: boolean
}): number {
  return [row.fajr, row.dhuhr, row.asr, row.maghrib, row.isha]
    .filter(Boolean).length
}

// Calculate current ibadah streak from sorted daily rows
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (const d of sorted) {
    const rowDate = parseISO(d)
    rowDate.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor.getTime() - rowDate.getTime()) / 86400000)
    if (diff === 0 || diff === 1) {
      streak++
      cursor = rowDate
    } else {
      break
    }
  }
  return streak
}
