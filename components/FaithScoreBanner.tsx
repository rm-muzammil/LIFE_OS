'use client'

import { useEffect, useState } from 'react'

interface FaithScore { score: number; days: number }

export function FaithScoreBanner() {
  const [data, setData] = useState<FaithScore | null>(null)

  useEffect(() => {
    fetch('/api/faith-score?days=7')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  const score = data?.score ?? 0

  // Green gradient intensity based on score
  const ring = score >= 80 ? 'ring-green-500' : score >= 50 ? 'ring-yellow-500' : 'ring-zinc-600'
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Steady' : score >= 40 ? 'Needs work' : 'Struggling'

  return (
    <div className="flex items-center gap-4 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-4">
      {/* Circular score */}
      <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-2 ${ring} bg-zinc-950`}>
        <span className="text-xl font-bold text-white">{score}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white">Faith Score</span>
          <span className="text-xs text-zinc-500">· 7-day rolling</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* Bar */}
          <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700"
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 whitespace-nowrap">{label}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Prayers · Quran · Mulk · Kahf · Dhikr &nbsp;—&nbsp; Full Life Score in Phase 4
        </p>
      </div>
    </div>
  )
}