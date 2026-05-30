'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Moon, BookOpen, Star, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

// Top 5 most-used routes for mobile bottom nav
const NAV = [
  { href: '/',          icon: LayoutDashboard, label: 'Home'    },
  { href: '/ibadah',    icon: Moon,            label: 'Ibadah'  },
  { href: '/quran',     icon: BookOpen,        label: 'Quran'   },
  { href: '/character', icon: Star,            label: 'Nafs'    },
  { href: '/review',    icon: ClipboardList,   label: 'Review'  },
]

export function MobileNav() {
  const path = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-zinc-950/95 backdrop-blur-md',
        'border-t border-zinc-800',
        // iOS safe area
        'pb-safe',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
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
              {active && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-brand-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
