'use client'

import { useEffect, useState } from 'react'

type DaySnapshot = {
  date: string
  green: boolean
}

type FaithDetails = {
  salah?: number
  rakuDone?: boolean
  verseDone?: boolean
  dhikrDone?: boolean
} | null

function isGreenDay(details: FaithDetails) {
  if (!details) return false
  return (
    details.salah === 5 &&
    !!details.rakuDone &&
    !!details.verseDone &&
    !!details.dhikrDone
  )
}

export default function GitHubBoxes() {
  const [connected, setConnected] = useState(true)
  const [today, setToday] = useState<FaithDetails>(null)
  const [history, setHistory] = useState<DaySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const provRes = await fetch('/api/provinces')
        const provData = await provRes.json()
        const list = provData.provinces ?? provData
        const faith = list.find((p: any) => p.slug === 'faith')

        if (!faith) {
          setConnected(false)
          setLoading(false)
          return
        }

        setToday(faith.cachedDetails ?? null)

        const histRes = await fetch('/api/provinces/faith-history')
        if (histRes.ok) {
          const histData = await histRes.json()
          setHistory(histData.days ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 animate-pulse">
        <div className="h-24 bg-zinc-900 rounded-lg" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-center text-sm text-zinc-500">
        Connect Faith Tracker
      </div>
    )
  }

  const days: DaySnapshot[] =
    history.length > 0
      ? history
      : [
          {
            date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
            green: isGreenDay(today),
          },
        ]

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={`h-3 w-3 rounded-sm ${
              d.green ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
