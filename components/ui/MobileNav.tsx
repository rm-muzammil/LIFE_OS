// src/components/ui/MobileNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Moon, BookOpen, Star, ClipboardList,
  BookMarked, Brain, Sparkles,Settings, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',          icon: LayoutDashboard, label: 'Home',   exact: true  },
  { href: '/ibadah',    icon: Moon,            label: 'Ibadah', exact: true  },
  { href: '/quran',     icon: BookOpen,        label: 'Quran',  exact: false },
  { href: '/character', icon: Star,            label: 'Nafs',   exact: true  },
  { href: '/review',    icon: ClipboardList,   label: 'Review', exact: true  },
  { href: '/life-score', icon: BarChart3,       label: 'Score',    exact: true },
  { href: '/settings',   icon: Settings,        label: 'Settings', exact: true },
]

const QURAN_SUB = [
  { href: '/quran/raku',         icon: BookOpen,   label: 'Raku'     },
  { href: '/quran/vocab',        icon: Brain,      label: 'Vocab'    },
  { href: '/quran/memorization', icon: BookMarked, label: 'Memorize' },
  { href: '/quran/impact',       icon: Sparkles,   label: 'Impact'   },
]

export function MobileNav() {
  const path = usePathname()
  const quranActive = path.startsWith('/quran')

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Quran sub-nav — only visible inside /quran/* */}
      {quranActive && (
        <div className="bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-around px-2 py-1.5">
          {QURAN_SUB.map(({ href, icon: Icon, label }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg',
                  'transition-colors duration-150 min-w-[60px]',
                  active ? 'text-brand-400' : 'text-zinc-500 active:text-zinc-300'
                )}
              >
                <Icon className={cn('w-4 h-4', active && 'stroke-[2.5px]')} />
                <span className={cn(
                  'text-[10px] font-medium',
                  active ? 'text-brand-400' : 'text-zinc-500'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Main bottom nav */}
      <nav
        className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? path === href : path.startsWith(href)
            const target = href === '/quran' ? '/quran/raku' : href
            return (
              <Link
                key={href}
                href={target}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl',
                  'transition-colors duration-150 min-w-[56px]',
                  active ? 'text-brand-400' : 'text-zinc-600 active:text-zinc-300'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
                <span className={cn(
                  'text-[10px] font-medium',
                  active ? 'text-brand-400' : 'text-zinc-600'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}