// src/components/ui/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Moon, BookOpen, Star,
  ClipboardList, BarChart3, Heart,
  BookMarked, Brain, Sparkles, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const QURAN_SUB = [
  { href: '/quran/raku',          icon: BookOpen,   label: 'Raku Tracker'    },
  { href: '/quran/vocab',         icon: Brain,      label: 'Vocab Bank'      },
  { href: '/quran/memorization',  icon: BookMarked, label: 'Memorization'    },
  { href: '/quran/impact',        icon: Sparkles,   label: 'Verses of Impact'},
]

const NAV = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/ibadah',     icon: Moon,            label: 'Daily Ibadah'   },
  { href: '/character',  icon: Star,            label: 'Character'      },
  { href: '/review',     icon: ClipboardList,   label: 'Weekly Review'  },
  { href: '/life-score', icon: BarChart3,       label: 'Life Score'     },
]

export function Sidebar() {
  const path = usePathname()
  const quranActive = path.startsWith('/quran')

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

      {/* Mission */}
      <div className="mx-2 mb-6 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <p className="text-xs text-zinc-500 mb-1 font-medium">Mission</p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Build wealth → Politics → Real Khilafah.
        </p>
        <p className="text-xs text-zinc-600 mt-1 italic">Not guaranteed. Committed regardless.</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {/* Dashboard + Ibadah first */}
        {NAV.slice(0, 2).map(({ href, icon: Icon, label }) => {
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

        {/* Quran group */}
        <div>
          {/* Parent row — links to first sub-route, shows expand indicator */}
          <Link
            href="/quran/raku"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150',
              quranActive
                ? 'bg-brand-900/40 text-brand-400 border border-brand-800/50'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
            )}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Quran & Arabic</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                quranActive ? 'rotate-180 text-brand-400' : 'text-zinc-700'
              )}
            />
          </Link>

          {/* Sub-links — visible when any /quran/* route is active */}
          {quranActive && (
            <div className="mt-1 ml-3 pl-3 border-l border-zinc-800 space-y-0.5">
              {QURAN_SUB.map(({ href, icon: Icon, label }) => {
                const active = path === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors duration-150',
                      active
                        ? 'text-brand-400 bg-brand-900/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Remaining nav items */}
        {NAV.slice(2).map(({ href, icon: Icon, label }) => {
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