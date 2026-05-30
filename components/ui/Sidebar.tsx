'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Moon, BookOpen, Star,
  ClipboardList, BarChart3, Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/ibadah',     icon: Moon,            label: 'Daily Ibadah' },
  { href: '/quran',      icon: BookOpen,         label: 'Quran & Arabic' },
  { href: '/character',  icon: Star,             label: 'Character' },
  { href: '/review',     icon: ClipboardList,    label: 'Weekly Review' },
  { href: '/life-score', icon: BarChart3,        label: 'Life Score' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col py-6 px-4">
      {/* Brand */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-zinc-100 tracking-tight">Self-Khilafah</span>
        </div>
        <p className="text-xs text-zinc-600 px-7">Life Governance · v1</p>
      </div>

      {/* Mission — always visible */}
      <div className="mx-2 mb-6 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <p className="text-xs text-zinc-500 mb-1 font-medium">Mission</p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Build wealth → Politics → Real Khilafah.
        </p>
        <p className="text-xs text-zinc-600 mt-1 italic">Not guaranteed. Committed regardless.</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150',
                active
                  ? 'bg-brand-900/40 text-brand-400 border border-brand-800/50'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Anchor ayah */}
      <div className="mx-2 mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <p className="font-arabic text-sm text-zinc-300 text-right leading-loose mb-1">
          وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ
        </p>
        <p className="text-xs text-zinc-600 italic">
          "Man gets only what he strives for." — 53:39
        </p>
      </div>
    </aside>
  )
}
