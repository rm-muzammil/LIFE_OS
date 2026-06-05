'use client'
// components/GitHubBoxes.tsx
// Contribution-style grid — green only when salah(5) + raku + verse + dhikr all done.
// 365 days, 7 rows (Mon–Sun), scrollable horizontally on mobile.

import { useEffect, useState } from 'react'
import { format, parseISO, getDay } from 'date-fns'

interface Day {
  date:  string
  green: boolean
  s: boolean  // salah
  r: boolean  // raku
  v: boolean  // verse
  d: boolean  // dhikr
}

interface Tooltip {
  day: Day
  x: number
  y: number
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function GitHubBoxes() {
  const [days,    setDays]    = useState<Day[]>([])
  const [streak,  setStreak]  = useState(0)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/github-boxes')
      .then(r => r.json())
      .then(data => {
        setDays(data.days)
        setStreak(data.streak)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-28 flex items-center justify-center">
      <p className="text-xs text-zinc-600 animate-pulse">Loading activity…</p>
    </div>
  )

  // Group days into columns (weeks), filling leading empty cells
  // so the grid aligns Mon–Sun correctly
  const firstDay = days[0] ? parseISO(days[0].date) : new Date()
  // getDay: 0=Sun,1=Mon...6=Sat → convert to Mon=0 offset
  const startOffset = (getDay(firstDay) + 6) % 7

  // Build columns: each column = one week (Mon at top)
  const columns: (Day | null)[][] = []
  let col: (Day | null)[] = Array(startOffset).fill(null)
  for (const day of days) {
    col.push(day)
    if (col.length === 7) { columns.push(col); col = [] }
  }
  if (col.length) {
    while (col.length < 7) col.push(null)
    columns.push(col)
  }

  // Month labels — show month name above first column of each new month
  const monthLabels: { colIdx: number; label: string }[] = []
  let lastMonth = ''
  columns.forEach((col, ci) => {
    const firstReal = col.find(d => d !== null)
    if (firstReal) {
      const m = format(parseISO(firstReal.date), 'MMM')
      if (m !== lastMonth) { monthLabels.push({ colIdx: ci, label: m }); lastMonth = m }
    }
  })

  const BOX = 11   // px size of each box
  const GAP =  2   // px gap

  return (
    <div className="space-y-2">
      {/* Streak label */}
      <div className="flex items-center justify-between">
        <p className="label">Governance streak</p>
        <p className="text-sm font-semibold text-brand-400">
          {streak} {streak === 1 ? 'day' : 'days'}
        </p>
      </div>

      {/* Scroll container */}
      <div className="overflow-x-auto pb-1">
        <div style={{ position: 'relative' }}>
          {/* Month labels row */}
          <div style={{ display: 'flex', marginLeft: 28, marginBottom: 2, height: 14 }}>
            {columns.map((_, ci) => {
              const ml = monthLabels.find(m => m.colIdx === ci)
              return (
                <div
                  key={ci}
                  style={{ width: BOX + GAP, flexShrink: 0, fontSize: 9,
                           color: '#71717a', lineHeight: '14px' }}
                >
                  {ml ? ml.label : ''}
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', gap: GAP }}>
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: 2 }}>
              {DAY_LABELS.map(l => (
                <div key={l} style={{ width: 24, height: BOX, fontSize: 8,
                                      color: '#52525b', lineHeight: `${BOX}px`, textAlign: 'right' }}>
                  {l}
                </div>
              ))}
            </div>

            {/* Columns */}
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {col.map((day, ri) => (
                  <div
                    key={ri}
                    style={{
                      width:  BOX,
                      height: BOX,
                      borderRadius: 2,
                      backgroundColor: day === null
                        ? 'transparent'
                        : day.green
                          ? '#16a34a'           // brand-600
                          : '#1c1c1e',          // zinc-900
                      cursor: day ? 'pointer' : 'default',
                      border: day && !day.green ? '1px solid #27272a' : 'none',
                    }}
                    onMouseEnter={e => day && setTooltip({
                      day,
                      x: (e.target as HTMLElement).getBoundingClientRect().left,
                      y: (e.target as HTMLElement).getBoundingClientRect().top,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <div className="flex items-center gap-1">
          <div style={{ width: BOX, height: BOX, borderRadius: 2, background: '#1c1c1e', border: '1px solid #27272a' }} />
          <span>Incomplete</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: BOX, height: BOX, borderRadius: 2, background: '#16a34a' }} />
          <span>All 4 done</span>
        </div>
        <span className="ml-auto">Salah · Raku · Verse · Dhikr</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <TooltipBox day={tooltip.day} />
      )}
    </div>
  )
}

function TooltipBox({ day }: { day: Day }) {
  return (
    <div className="mt-2 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs space-y-1">
      <p className="text-zinc-300 font-medium mb-1">
        {format(parseISO(day.date), 'EEE, d MMM yyyy')}
      </p>
      <p className={day.s ? 'text-brand-400' : 'text-zinc-600'}>
        {day.s ? '✓' : '✗'} Salah (5/5)
      </p>
      <p className={day.r ? 'text-brand-400' : 'text-zinc-600'}>
        {day.r ? '✓' : '✗'} Raku session
      </p>
      <p className={day.v ? 'text-brand-400' : 'text-zinc-600'}>
        {day.v ? '✓' : '✗'} Daily verse
      </p>
      <p className={day.d ? 'text-brand-400' : 'text-zinc-600'}>
        {day.d ? '✓' : '✗'} Dhikr
      </p>
    </div>
  )
}
