'use client'

import { useEffect, useState } from 'react'

type Province = {
  slug: string
  name: string
  cachedScore: number | null
  cachedDetails: Record<string, any> | null
  cachedAt: string | null
}

type LifeScoreResponse = {
  lifeScore: number
  components: { slug: string; score: number; weight: number }[]
}

function isStale(cachedAt: string | null) {
  if (!cachedAt) return true
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  return ageMs > 24 * 60 * 60 * 1000
}

function timeAgo(cachedAt: string | null) {
  if (!cachedAt) return 'never'
  const ms = Date.now() - new Date(cachedAt).getTime()
  const hrs = Math.floor(ms / (1000 * 60 * 60))
  if (hrs < 1) return 'just now'
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function streakFromDetails(details: Record<string, any> | null): number | null {
  if (!details) return null
  // Province apps are expected to push a `streak` field in cachedDetails.
  return typeof details.streak === 'number' ? details.streak : null
}

export default function ProvinceScoreStrip() {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [lifeScore, setLifeScore] = useState<LifeScoreResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [provRes, lifeRes] = await Promise.all([
          fetch('/api/provinces'),
          fetch('/api/life-score'),
        ])
        const provData = await provRes.json()
        const lifeData = await lifeRes.json()
        setProvinces(provData.provinces ?? provData)
        setLifeScore(lifeData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 animate-pulse">
        <div className="h-16 bg-zinc-900 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-3">
      {/* Weighted total life score */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <span className="text-sm text-zinc-400">Life Score</span>
        <span className="text-2xl font-semibold text-emerald-400 tabular-nums">
          {lifeScore ? Math.round(lifeScore.lifeScore) : '—'}
        </span>
      </div>

      {/* Province cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {provinces.map((p) => {
          const stale = isStale(p.cachedAt)
          const streak = streakFromDetails(p.cachedDetails)
          return (
            <div
              key={p.slug}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 relative"
            >
              {stale && (
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
                  stale
                </span>
              )}
              <span className="text-xs text-zinc-500 capitalize">{p.name}</span>
              <span className="text-xl font-semibold text-emerald-400 tabular-nums">
                {p.cachedScore != null ? Math.round(p.cachedScore) : '—'}
              </span>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{streak != null ? `🔥 ${streak}d` : '—'}</span>
                <span>{timeAgo(p.cachedAt)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
