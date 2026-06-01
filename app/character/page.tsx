'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import { toIsoWeek, isoWeekLabel } from '@/lib/isoWeek'

const VIRTUES = [
  { key: 'patience',     label: 'Patience',     color: '#4ade80' },
  { key: 'discipline',   label: 'Discipline',   color: '#60a5fa' },
  { key: 'gratitude',    label: 'Gratitude',    color: '#f59e0b' },
  { key: 'humility',     label: 'Humility',     color: '#a78bfa' },
  { key: 'truthfulness', label: 'Truthfulness', color: '#f87171' },
] as const

type VirtueKey = typeof VIRTUES[number]['key']
type Ratings = Record<VirtueKey, number>

const DEFAULT_RATINGS: Ratings = {
  patience: 3, discipline: 3, gratitude: 3, humility: 3, truthfulness: 3,
}

interface HistoryRow {
  isoWeek: string
  patience: number
  discipline: number
  gratitude: number
  humility: number
  truthfulness: number
}

export default function CharacterPage() {
  const currentWeek = toIsoWeek()
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [ratings, setRatings] = useState<Ratings>(DEFAULT_RATINGS)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/character?weeks=8').then(r => r.json()),
      fetch(`/api/character?week=${currentWeek}`).then(r => r.json()),
    ]).then(([hist, current]) => {
      setHistory(hist)
      if (current) {
        setRatings({
          patience:     current.patience,
          discipline:   current.discipline,
          gratitude:    current.gratitude,
          humility:     current.humility,
          truthfulness: current.truthfulness,
        })
      }
      setLoading(false)
    })
  }, [currentWeek])

  async function handleSave() {
    const res = await fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isoWeek: currentWeek, ...ratings }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      // Refresh history
      const hist = await fetch('/api/character?weeks=8').then(r => r.json())
      setHistory(hist)
    }
  }

  // Build chart data: merge history + pending current week
  const chartData = (() => {
    const map = new Map(history.map(r => [r.isoWeek, r]))
    map.set(currentWeek, { isoWeek: currentWeek, ...ratings })
    return Array.from(map.values())
      .sort((a, b) => a.isoWeek.localeCompare(b.isoWeek))
      .slice(-8)
      .map(r => ({ ...r, label: isoWeekLabel(r.isoWeek).slice(0, 6) }))
  })()

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Character</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Week of {isoWeekLabel(currentWeek)} &nbsp;·&nbsp; {currentWeek}
      </p>

      {/* Rating sliders */}
      <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-5">
          Rate this week
        </h2>
        <div className="space-y-5">
          {VIRTUES.map(v => (
            <div key={v.key}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{v.label}</span>
                <span className="text-sm font-bold" style={{ color: v.color }}>
                  {ratings[v.key]}/5
                </span>
              </div>
              <input
                type="range"
                min={1} max={5} step={1}
                value={ratings[v.key]}
                onChange={e => setRatings(r => ({ ...r, [v.key]: Number(e.target.value) }))}
                className="w-full accent-green-500 h-2 rounded-full"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-0.5">
                <span>Weak</span><span>Strong</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="mt-6 w-full rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 transition-colors"
        >
          {saved ? '✓ Saved' : 'Save ratings'}
        </button>
      </section>

      {/* Trend chart */}
      <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-5">
          8-week trend
        </h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Loading…</div>
        ) : chartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Add a second week to see trends
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                itemStyle={{ fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="circle"
                iconSize={8}
              />
              {VIRTUES.map(v => (
                <Line
                  key={v.key}
                  type="monotone"
                  dataKey={v.key}
                  name={v.label}
                  stroke={v.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: v.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </main>
  )
}