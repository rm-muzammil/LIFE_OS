'use client'
import { useState, useEffect, useCallback } from 'react'
import { todayStr, formatDisplay, isFridayToday } from '@/lib/utils'
import { Moon, BookOpen, Heart, Feather, Save, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
type Prayer   = (typeof PRAYERS)[number]

interface IbadahState {
  fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean
  quranPages: number
  dhikrDone: boolean
  surahMulk: boolean
  surahKahf: boolean
  reflection: string
}

const DEFAULT: IbadahState = {
  fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
  quranPages: 0,
  dhikrDone: false,
  surahMulk: false,
  surahKahf: false,
  reflection: '',
}

export default function IbadahPage() {
  const [data, setData]       = useState<IbadahState>(DEFAULT)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)
  const today    = todayStr()
  const isFriday = isFridayToday()

  // Load today's record
  useEffect(() => {
    fetch(`/api/ibadah?date=${today}`)
      .then(r => r.json())
      .then(row => {
        if (row) setData({
          fajr: row.fajr, dhuhr: row.dhuhr, asr: row.asr,
          maghrib: row.maghrib, isha: row.isha,
          quranPages: row.quranPages,
          dhikrDone: row.dhikrDone,
          surahMulk: row.surahMulk,
          surahKahf: row.surahKahf,
          reflection: row.reflection,
        })
      })
      .finally(() => setLoading(false))
  }, [today])

  const save = useCallback(async (patch: Partial<IbadahState>) => {
    setSaving(true)
    setSaved(false)
    const next = { ...data, ...patch }
    setData(next)
    await fetch('/api/ibadah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, ...next }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [data, today])

  const togglePrayer = (p: Prayer) => {
    const key = p.toLowerCase() as keyof IbadahState
    save({ [key]: !data[key] } as Partial<IbadahState>)
  }

  const prayersDone = PRAYERS.filter(p => data[p.toLowerCase() as keyof IbadahState]).length
  const allFive     = prayersDone === 5

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-zinc-600 text-sm animate-pulse">Loading…</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="label mb-1">Daily Ibadah</p>
          <h1 className="text-2xl font-semibold text-zinc-100">{formatDisplay(today)}</h1>
          {isFriday && (
            <p className="mt-1 text-sm text-amber-400 flex items-center gap-1">
              ★ Jumu&apos;ah — read Surah Al-Kahf today
            </p>
          )}
        </div>
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all',
          saved  ? 'bg-brand-900/30 text-brand-400 border border-brand-800' :
          saving ? 'bg-zinc-800 text-zinc-400' :
                   'text-zinc-700'
        )}>
          {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</> :
           saving ? 'Saving…' : 'Auto-saves'}
        </div>
      </div>

      {/* ── Salah ── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <p className="font-medium text-zinc-100">Salah</p>
          </div>
          <span className={cn(
            'text-sm font-medium px-3 py-1 rounded-full',
            allFive ? 'bg-brand-900/30 text-brand-400' : 'text-zinc-500'
          )}>
            {prayersDone} / 5
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {PRAYERS.map(p => {
            const done = Boolean(data[p.toLowerCase() as keyof IbadahState])
            return (
              <button
                key={p}
                onClick={() => togglePrayer(p)}
                className={cn('prayer-btn', done ? 'prayer-btn-on' : 'prayer-btn-off')}
              >
                <span className="text-lg">{done ? '✓' : '○'}</span>
                <span className="text-xs font-medium">{p}</span>
              </button>
            )
          })}
        </div>

        {allFive && (
          <p className="text-center text-xs text-brand-500 animate-pulse">
            الله أكبر — All five prayers completed
          </p>
        )}
      </section>

      {/* ── Quran pages ── */}
      <section className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <p className="font-medium text-zinc-100">Quran reading</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => save({ quranPages: Math.max(0, data.quranPages - 1) })}
            className="w-10 h-10 rounded-xl border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors text-lg"
          >−</button>
          <div className="flex-1 text-center">
            <span className="text-4xl font-semibold text-zinc-100">{data.quranPages}</span>
            <p className="text-xs text-zinc-600 mt-1">pages today</p>
          </div>
          <button
            onClick={() => save({ quranPages: data.quranPages + 1 })}
            className="w-10 h-10 rounded-xl border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors text-lg"
          >+</button>
        </div>
        {/* Quick-set buttons */}
        <div className="flex gap-2 justify-center">
          {[1, 2, 4, 8].map(n => (
            <button
              key={n}
              onClick={() => save({ quranPages: n })}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                data.quranPages === n
                  ? 'border-brand-700 bg-brand-900/30 text-brand-400'
                  : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
              )}
            >
              {n}p
            </button>
          ))}
        </div>
      </section>

      {/* ── Sunnah recitations ── */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-4 h-4 text-rose-400" />
          <p className="font-medium text-zinc-100">Sunnah recitations</p>
        </div>

        {/* Surah Mulk — every night */}
        <button
          onClick={() => save({ surahMulk: !data.surahMulk })}
          className={cn('check-tile w-full text-left', data.surahMulk ? 'check-tile-on' : 'check-tile-off')}
        >
          <div>
            <p className="text-sm font-medium text-zinc-200">Surah Al-Mulk</p>
            <p className="text-xs text-zinc-600">Recite every night before sleep · 30 ayahs</p>
          </div>
          <span className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-sm border',
            data.surahMulk ? 'bg-brand-700 border-brand-600 text-white' : 'border-zinc-700 text-zinc-700'
          )}>
            {data.surahMulk ? '✓' : ''}
          </span>
        </button>

        {/* Surah Kahf — Friday only */}
        <button
          onClick={() => save({ surahKahf: !data.surahKahf })}
          className={cn(
            'check-tile w-full text-left',
            !isFriday && 'opacity-40 cursor-not-allowed',
            data.surahKahf ? 'check-tile-on' : 'check-tile-off'
          )}
          disabled={!isFriday}
        >
          <div>
            <p className="text-sm font-medium text-zinc-200">Surah Al-Kahf</p>
            <p className="text-xs text-zinc-600">
              {isFriday ? 'Today is Friday — recite today · 110 ayahs' : 'Available on Fridays only'}
            </p>
          </div>
          <span className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-sm border',
            data.surahKahf ? 'bg-brand-700 border-brand-600 text-white' :
            isFriday       ? 'border-amber-700/50 text-amber-700' : 'border-zinc-800 text-zinc-800'
          )}>
            {data.surahKahf ? '✓' : isFriday ? '☽' : ''}
          </span>
        </button>
      </section>

      {/* ── Dhikr ── */}
      <section className="card">
        <button
          onClick={() => save({ dhikrDone: !data.dhikrDone })}
          className={cn('check-tile w-full text-left', data.dhikrDone ? 'check-tile-on' : 'check-tile-off')}
        >
          <div>
            <p className="text-sm font-medium text-zinc-200">Dhikr</p>
            <p className="text-xs text-zinc-600">SubhanAllah · Alhamdulillah · Allahu Akbar</p>
          </div>
          <span className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-sm border',
            data.dhikrDone ? 'bg-brand-700 border-brand-600 text-white' : 'border-zinc-700 text-zinc-700'
          )}>
            {data.dhikrDone ? '✓' : ''}
          </span>
        </button>
      </section>

      {/* ── Reflection ── */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <Feather className="w-4 h-4 text-amber-400" />
          <p className="font-medium text-zinc-100">Daily reflection</p>
          <span className="text-xs text-zinc-600">one honest line</span>
        </div>
        <textarea
          value={data.reflection}
          onChange={e => setData(d => ({ ...d, reflection: e.target.value }))}
          onBlur={() => save({ reflection: data.reflection })}
          rows={3}
          placeholder="What was today's most important moment, lesson, or intention?"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                     text-sm text-zinc-200 placeholder-zinc-600 resize-none
                     focus:outline-none focus:border-brand-700 transition-colors"
        />
        <button
          onClick={() => save({ reflection: data.reflection })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Save className="w-3.5 h-3.5" />
          Save reflection
        </button>
      </section>
    </div>
  )
}
