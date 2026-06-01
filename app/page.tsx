import { db } from '@/lib/db'
import { ibadah } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { todayStr, formatDisplay, prayerCount, calcStreak, isFridayToday } from '@/lib/utils'
import { Flame, BookOpen, Star, Moon, CheckCircle2 } from 'lucide-react'
import { FaithScoreBanner } from '@/components/FaithScoreBanner'

async function getDashboardData() {
  const today = todayStr()
  const todayRow = await db.select().from(ibadah).where(eq(ibadah.date, today))
  const allRows  = await db.select().from(ibadah)

  const fullDays = allRows
    .filter(r => r.fajr && r.dhuhr && r.asr && r.maghrib && r.isha)
    .map(r => r.date)

  return {
    today:   todayRow[0] ?? null,
    streak:  calcStreak(fullDays),
    total:   allRows.length,
    isFriday: isFridayToday(),
    dateStr: today,
  }
}

export default async function DashboardPage() {
  const { today, streak, total, isFriday, dateStr } = await getDashboardData()

  const prayers = today ? prayerCount(today) : 0
  const allFive = prayers === 5

  return (
    <div className="space-y-8">
      <FaithScoreBanner />
      {/* Header */}
      <div>
        <p className="label mb-1">Dashboard</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{formatDisplay(dateStr)}</h1>
        {isFriday && (
          <p className="mt-1 text-sm text-brand-400">
            Jumu&apos;ah Mubarak — remember Surah Al-Kahf today
          </p>
        )}
      </div>

      {/* Streak + stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          value={streak}
          label="Prayer streak"
          sub="full 5-prayer days"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-brand-400" />}
          value={prayers}
          label="Prayers today"
          sub={allFive ? 'All five ✓' : `${5 - prayers} remaining`}
          highlight={allFive}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-blue-400" />}
          value={today?.quranPages ?? 0}
          label="Pages today"
          sub="Quran reading"
        />
      </div>

      {/* Today's ibadah snapshot */}
      <div className="card space-y-5">
        <p className="label">Today&apos;s snapshot</p>

        {/* Prayers */}
        <div>
          <p className="text-sm text-zinc-400 mb-3">Salah</p>
          <div className="flex gap-2">
            {(['Fajr','Dhuhr','Asr','Maghrib','Isha'] as const).map((p, i) => {
              const key = p.toLowerCase() as keyof typeof today
              const done = today ? Boolean(today[key]) : false
              return (
                <div
                  key={p}
                  className={`flex-1 text-center py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
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
        </div>

        {/* Sunnah recitations */}
        <div>
          <p className="text-sm text-zinc-400 mb-3">Sunnah recitations</p>
          <div className="flex gap-3">
            <RecitationBadge label="Surah Mulk" done={today?.surahMulk ?? false} sub="nightly" />
            {isFriday && (
              <RecitationBadge label="Surah Al-Kahf" done={today?.surahKahf ?? false} sub="Friday" highlight />
            )}
          </div>
        </div>

        {/* Dhikr + Reflection */}
        <div className="grid grid-cols-2 gap-3">
          <TileStat
            label="Dhikr"
            done={today?.dhikrDone ?? false}
          />
          <TileStat
            label="Reflection written"
            done={Boolean(today?.reflection && today.reflection.trim().length > 0)}
          />
        </div>

        {today?.reflection && (
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-1">Today&apos;s reflection</p>
            <p className="text-sm text-zinc-300 italic">&ldquo;{today.reflection}&rdquo;</p>
          </div>
        )}

        <a
          href="/ibadah"
          className="block w-full text-center btn-primary py-3 mt-2"
        >
          {today ? 'Update today' : 'Log ibadah now'} →
        </a>
      </div>

      {/* Days tracked */}
      <p className="text-xs text-zinc-600 text-center">
        {total} days tracked in total
      </p>
    </div>
  )
}

function StatCard({
  icon, value, label, sub, highlight = false
}: {
  icon: React.ReactNode
  value: number
  label: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div className={`card-sm space-y-2 ${highlight ? 'border-brand-800' : ''}`}>
      {icon}
      <p className={`text-3xl font-semibold ${highlight ? 'text-brand-400' : 'text-zinc-100'}`}>
        {value}
      </p>
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        <p className="text-xs text-zinc-600">{sub}</p>
      </div>
    </div>
  )
}

function RecitationBadge({
  label, done, sub, highlight = false
}: {
  label: string; done: boolean; sub: string; highlight?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
      done
        ? 'border-brand-700 bg-brand-900/20 text-brand-400'
        : highlight
          ? 'border-amber-700/50 bg-amber-900/10 text-amber-500/70'
          : 'border-zinc-800 text-zinc-600'
    }`}>
      <Moon className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="text-xs opacity-60">({sub})</span>
    </div>
  )
}

function TileStat({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`px-4 py-3 rounded-xl border flex items-center justify-between ${
      done ? 'border-brand-700 bg-brand-900/20' : 'border-zinc-800'
    }`}>
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-medium ${done ? 'text-brand-400' : 'text-zinc-700'}`}>
        {done ? '✓' : '—'}
      </span>
    </div>
  )
}
