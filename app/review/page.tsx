'use client'

import { useEffect, useState } from 'react'
import { toIsoWeek, isoWeekLabel } from '@/lib/isoWeek'

const VIRTUES = ['Patience', 'Discipline', 'Gratitude', 'Humility', 'Truthfulness'] as const

interface CharacterRow {
  patience: number; discipline: number; gratitude: number
  humility: number; truthfulness: number
}

interface ReviewRow {
  isoWeek: string
  wentWell: string; wentWrong: string; distractions: string
  mustImprove: string; intentions: string
  missionAlignScore: number; missionAlignNote: string
}

interface HistoryItem { id: number; isoWeek: string; missionAlignScore: number }

const QUESTIONS: { key: keyof Omit<ReviewRow, 'isoWeek'>; label: string; placeholder: string }[] = [
  { key: 'wentWell',     label: 'What went well this week?',  placeholder: 'Wins, breakthroughs, moments of gratitude…' },
  { key: 'wentWrong',    label: 'What went wrong?',           placeholder: 'Failures, mistakes, regrets…' },
  { key: 'distractions', label: 'What distracted me?',        placeholder: 'Time-wasters, temptations, noise…' },
  { key: 'mustImprove',  label: 'What must improve?',         placeholder: 'One specific commitment for next week…' },
  { key: 'intentions',   label: 'Intentions for next week',   placeholder: 'Bismillah — what will you carry into next week?' },
]

const BLANK: Omit<ReviewRow, 'isoWeek'> = {
  wentWell: '', wentWrong: '', distractions: '',
  mustImprove: '', intentions: '', missionAlignScore: 3, missionAlignNote: '',
}

export default function ReviewPage() {
  const currentWeek = toIsoWeek()
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [form, setForm] = useState<Omit<ReviewRow, 'isoWeek'>>(BLANK)
  const [character, setCharacter] = useState<CharacterRow | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const isCurrentWeek = selectedWeek === currentWeek

  // Load history list once
  useEffect(() => {
    fetch('/api/review?limit=20').then(r => r.json()).then(setHistory)
  }, [])

  // Load selected week data
  useEffect(() => {
    setLoading(true)
    fetch(`/api/review?week=${selectedWeek}`)
      .then(r => r.json())
      .then(({ review, character: char }) => {
        if (review) {
          const { isoWeek: _, createdAt: __, updatedAt: ___, ...fields } = review as ReviewRow & { createdAt: unknown; updatedAt: unknown }
          setForm(fields as Omit<ReviewRow, 'isoWeek'>)
        } else {
          setForm(BLANK)
        }
        setCharacter(char ?? null)
        setLoading(false)
      })
  }, [selectedWeek])

  function set(key: keyof typeof BLANK, val: string | number) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isoWeek: selectedWeek, ...form }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      const hist = await fetch('/api/review?limit=20').then(r => r.json())
      setHistory(hist)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Weekly Review</h1>

      {/* Week selector */}
      <div className="flex gap-2 items-center mb-6 flex-wrap">
        <button
          onClick={() => setSelectedWeek(currentWeek)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isCurrentWeek ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          This week
        </button>
        {history
          .filter(h => h.isoWeek !== currentWeek)
          .map(h => (
            <button
              key={h.isoWeek}
              onClick={() => setSelectedWeek(h.isoWeek)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedWeek === h.isoWeek
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {h.isoWeek}
            </button>
          ))}
      </div>

      <p className="text-zinc-400 text-sm mb-8">
        {isoWeekLabel(selectedWeek)} · {selectedWeek}
        {!isCurrentWeek && <span className="ml-2 text-zinc-600">(read-only)</span>}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-600">Loading…</div>
      ) : (
        <>
          {/* Four questions + intentions */}
          <section className="space-y-5 mb-8">
            {QUESTIONS.map(q => (
              <div key={q.key} className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <label className="block text-sm font-semibold text-zinc-300 mb-2">{q.label}</label>
                <textarea
                  rows={3}
                  disabled={!isCurrentWeek}
                  placeholder={isCurrentWeek ? q.placeholder : '—'}
                  value={form[q.key] as string}
                  onChange={e => set(q.key, e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 resize-none focus:outline-none focus:border-green-600 disabled:opacity-60 disabled:cursor-default"
                />
              </div>
            ))}
          </section>

          {/* Mission alignment */}
          <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-8">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">
              Mission alignment
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Did my actions this week move toward Phase 1 — wealth building?
            </p>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  disabled={!isCurrentWeek}
                  onClick={() => set('missionAlignScore', n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors disabled:cursor-default ${
                    form.missionAlignScore === n
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="text"
              disabled={!isCurrentWeek}
              placeholder={isCurrentWeek ? 'One line…' : '—'}
              value={form.missionAlignNote}
              onChange={e => set('missionAlignNote', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-green-600 disabled:opacity-60 disabled:cursor-default"
            />
          </section>

          {/* Character summary (read from /character) */}
          <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-8">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">
              Character ratings this week
            </h2>
            {character ? (
              <div className="grid grid-cols-5 gap-2 text-center">
                {(['patience', 'discipline', 'gratitude', 'humility', 'truthfulness'] as const).map((k, i) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-green-400">{character[k]}</span>
                    <span className="text-xs text-zinc-500 leading-tight">{VIRTUES[i]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                No character ratings for this week.{' '}
                {isCurrentWeek && (
                  <a href="/character" className="text-green-500 hover:underline">
                    Add them →
                  </a>
                )}
              </p>
            )}
          </section>

          {isCurrentWeek && (
            <button
              onClick={handleSave}
              className="w-full rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold py-3 transition-colors"
            >
              {saved ? '✓ Review saved' : 'Save review'}
            </button>
          )}
        </>
      )}
    </main>
  )
}