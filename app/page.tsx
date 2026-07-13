import ProvinceScoreStrip from '@/components/ProvinceScoreStrip'
import GitHubBoxes from '@/components/GitHubBoxes'
import { WeeklyGraphs } from '@/components/WeeklyGraphs'
import LifeScoreRing from '@/components/LifeScoreRing'

function isJumuah() {
  // Friday = 5
  const pktDay = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
  ).getDay()
  return pktDay === 5
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6 space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium text-zinc-300">{today}</h1>
        {isJumuah() && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-3 py-2">
            Jumu'ah Mubarak — don't miss the khutbah.
          </div>
        )}
      </header>

      <LifeScoreRing />

      <ProvinceScoreStrip />

      <GitHubBoxes />

      <WeeklyGraphs />
    </main>
  )
}
