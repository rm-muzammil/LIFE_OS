// app/page.tsx
import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { todayStr, formatDisplay, prayerCount, isFridayToday } from '@/lib/utils'
import { Moon } from 'lucide-react'
import { FaithScoreBanner } from '@/components/FaithScoreBanner'
import { GitHubBoxes } from '@/components/GitHubBoxes'
import { WeeklyGraphs } from '@/components/WeeklyGraphs'

async function getDashboardData() {
  const today    = todayStr()
  const todayRow = await db.select().from(ibadah).where(eq(ibadah.date, today))
  return {
    today:    todayRow[0] ?? null,
    isFriday: isFridayToday(),
    dateStr:  today,
  }
}

export default async function DashboardPage() {
  const { today, isFriday, dateStr } = await getDashboardData()
  const prayers = today ? prayerCount(today) : 0
  const allFive = prayers === 5

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="label mb-1">Dashboard</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{formatDisplay(dateStr)}</h1>
        {isFriday && (
          <p className="mt-1 text-sm text-amber-400">
            Jumu&apos;ah Mubarak — remember Surah Al-Kahf today
          </p>
        )}
      </div>

      {/* Daily governance score */}
      <FaithScoreBanner />

      {/* GitHub-style activity grid */}
      <div className="card">
        <GitHubBoxes />
      </div>

      {/* Today's salah snapshot */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <p className="label">Today&apos;s salah</p>
          <span className={`text-sm font-medium ${allFive ? 'text-brand-400' : 'text-zinc-500'}`}>
            {prayers} / 5
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {(['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const).map(p => {
            const done = today ? Boolean(today[p.toLowerCase() as keyof typeof today]) : false
            return (
              <div
                key={p}
                className={`text-center py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  done
                    ? 'border-brand-700 bg-brand-900/30 text-brand-400'
                    : 'border-zinc-800 text-zinc-600'
                }`}
              >
                {p}
              </div>
            )
          })}
        </div>

        {/* Sunnah */}
        <div className="flex gap-2 flex-wrap">
          <Badge label="Surah Mulk" done={today?.surahMulk ?? false} sub="nightly" />
          {isFriday && (
            <Badge label="Surah Al-Kahf" done={today?.surahKahf ?? false} sub="Friday" amber />
          )}
          <Badge label="Dhikr" done={today?.dhikrDone ?? false} sub="daily" />
        </div>

        <a
          href="/ibadah"
          className="block w-full text-center btn-primary py-3"
        >
          {today ? 'Update today' : 'Log ibadah now'} →
        </a>
      </div>

      {/* Weekly graphs — standalone, not linked to streak */}
      <WeeklyGraphs />
    </div>
  )
}

function Badge({
  label, done, sub, amber = false
}: {
  label: string; done: boolean; sub: string; amber?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
      done
        ? 'border-brand-700 bg-brand-900/20 text-brand-400'
        : amber
          ? 'border-amber-800/50 bg-amber-900/10 text-amber-600/70'
          : 'border-zinc-800 text-zinc-600'
    }`}>
      <Moon className="w-3 h-3" />
      <span>{label}</span>
      <span className="opacity-50">· {sub}</span>
    </div>
  )
}
