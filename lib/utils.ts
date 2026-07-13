import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isFriday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// PKT-aware — fixes UTC offset on Vercel (UTC) for Pakistan (UTC+5)
export function todayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export function formatDisplay(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, d MMMM yyyy')
}

export function isFridayToday(): boolean {
  const day = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
  })
  return day === 'Friday'
}

export function prayerCount(row: {
  fajr: boolean; dhuhr: boolean; asr: boolean
  maghrib: boolean; isha: boolean
}): number {
  return [row.fajr, row.dhuhr, row.asr, row.maghrib, row.isha]
    .filter(Boolean).length
}

export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let cursor = todayStr()

  for (const d of sorted) {
    const diff = Math.round(
      (new Date(cursor).getTime() - new Date(d).getTime()) / 86400000
    )
    if (diff === 0 || diff === 1) {
      streak++
      cursor = d
    } else {
      break
    }
  }
  return streak
}