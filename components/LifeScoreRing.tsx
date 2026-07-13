'use client'

import { useEffect, useState } from 'react'

export default function LifeScoreRing() {
  const [score, setScore] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/life-score')
      .then((r) => r.json())
      .then((d) => setScore(d.lifeScore ?? null))
      .catch(() => setScore(null))
  }, [])

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--zinc-800, #27272a)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score != null ? offset : circumference}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          className="rotate-90"
          transform="rotate(90 50 50)"
          fill="#e4e4e7"
          fontSize="20"
          fontWeight="600"
        >
          {score != null ? Math.round(score) : '—'}
        </text>
      </svg>
    </div>
  )
}
