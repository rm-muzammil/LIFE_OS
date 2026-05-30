'use client'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/ibadah':     'Daily Ibadah',
  '/quran':      'Quran & Arabic',
  '/character':  'Character',
  '/review':     'Weekly Review',
  '/life-score': 'Life Score',
}

export function MobileHeader() {
  const path = usePathname()
  const title = TITLES[path] ?? 'Self-Khilafah'

  return (
    <header className="md:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span className="font-semibold text-zinc-100 text-sm">{title}</span>
        </div>
        <p className="text-xs text-zinc-600 font-arabic">وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ</p>
      </div>
    </header>
  )
}
