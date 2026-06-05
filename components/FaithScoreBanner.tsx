'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface DailyScore {
  score: number
  breakdown: { salah: number; raku: number; verse: number; dhikr: number }
  prayers:   number
  rakuDone:  boolean
  verseDone: boolean
  dhikrDone: boolean
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-brand-400'
  if (s >= 50) return 'text-amber-400'
  return 'text-zinc-500'
}

function barColor(s: number) {
  if (s >= 80) return 'bg-brand-500'
  if (s >= 50) return 'bg-amber-500'
  return 'bg-zinc-600'
}

export function FaithScoreBanner() {
  const [data,    setData]    = useState<DailyScore | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchScore = useCallback(() => {
    fetch('/api/daily-score')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchScore()

    // Refetch every 30 seconds
    const interval = setInterval(fetchScore, 30_000)

    // Refetch when tab regains focus (coming back from ibadah page)
    window.addEventListener('focus', fetchScore)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', fetchScore)
    }
  }, [fetchScore])

  if (loading) return <div className="card-sm h-16 animate-pulse bg-zinc-900" />
  if (!data) return null

  const items = [
    { label: 'Salah', pts: data.breakdown.salah, done: data.prayers === 5, sub: `${data.prayers}/5` },
    { label: 'Raku',  pts: data.breakdown.raku,  done: data.rakuDone,      sub: data.rakuDone  ? '✓' : '—' },
    { label: 'Verse', pts: data.breakdown.verse, done: data.verseDone,     sub: data.verseDone ? '✓' : '—' },
    { label: 'Dhikr', pts: data.breakdown.dhikr, done: data.dhikrDone,     sub: data.dhikrDone ? '✓' : '—' },
  ]

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="label mb-0.5">Daily governance score</p>
          <p className="text-xs text-zinc-600">Resets at midnight</p>
        </div>
        <div className="text-right">
          <p className={cn('text-4xl font-semibold tabular-nums', scoreColor(data.score))}>
            {data.score}
          </p>
          <p className="text-xs text-zinc-600">/ 100</p>
        </div>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor(data.score))}
          style={{ width: `${data.score}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.label} className={cn(
            'text-center p-2 rounded-lg border',
            item.done ? 'border-brand-800 bg-brand-900/20' : 'border-zinc-800'
          )}>
            <p className={cn('text-sm font-medium', item.done ? 'text-brand-400' : 'text-zinc-600')}>
              {item.pts}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{item.label}</p>
            <p className={cn('text-[10px] mt-0.5', item.done ? 'text-brand-500' : 'text-zinc-700')}>
              {item.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}