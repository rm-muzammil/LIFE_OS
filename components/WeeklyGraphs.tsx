'use client'
// components/WeeklyGraphs.tsx
// Two standalone panels: character trend (line chart) + recent reflections.
// Not linked to streak or life score — pure self-awareness.

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface CharacterWeek {
  isoWeek:      string
  patience:     number
  discipline:   number
  gratitude:    number
  humility:     number
  truthfulness: number
}

interface ReflectionDay {
  date:       string
  reflection: string
}

const VIRTUES = [
  { key: 'patience',     color: '#22c55e', label: 'Patience'     },
  { key: 'discipline',   color: '#3b82f6', label: 'Discipline'   },
  { key: 'gratitude',    color: '#f59e0b', label: 'Gratitude'    },
  { key: 'humility',     color: '#a78bfa', label: 'Humility'     },
  { key: 'truthfulness', color: '#f87171', label: 'Truthfulness' },
]

function weekLabel(isoWeek: string) {
  // "2025-W23" → "W23"
  return isoWeek.split('-')[1]
}

export function WeeklyGraphs() {
  const [charData,    setCharData]    = useState<CharacterWeek[]>([])
  const [reflections, setReflections] = useState<ReflectionDay[]>([])
  const [tab,         setTab]         = useState<'character' | 'reflections'>('character')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/character').then(r => r.json()),
      fetch('/api/ibadah/reflections').then(r => r.json()),
    ]).then(([char, ref]) => {
      setCharData(char.history ?? [])
      setReflections(ref.reflections ?? [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="card space-y-4">
      {/* Tab switcher */}
      <div className="flex items-center justify-between">
        <p className="label">Self-awareness</p>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
          {(['character', 'reflections'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'character' ? 'Character' : 'Reflections'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-zinc-600 animate-pulse">Loading…</p>
        </div>
      )}

      {/* Character line chart */}
      {!loading && tab === 'character' && (
        <>
          {charData.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">
              No character ratings yet — log your first week in Character tab.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charData.map(w => ({ ...w, week: weekLabel(w.isoWeek) }))}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  width={16}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b', border: '1px solid #3f3f46',
                    borderRadius: 8, fontSize: 12,
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 11 }}
                />
                {VIRTUES.map(v => (
                  <Line
                    key={v.key}
                    type="monotone"
                    dataKey={v.key}
                    name={v.label}
                    stroke={v.color}
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: v.color }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      )}

      {/* Reflections list */}
      {!loading && tab === 'reflections' && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {reflections.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">
              No reflections yet — write your first in Daily Ibadah.
            </p>
          ) : (
            reflections.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">{r.date}</p>
                <p className="text-sm text-zinc-300 italic">&ldquo;{r.reflection}&rdquo;</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
