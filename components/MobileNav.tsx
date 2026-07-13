'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/character', label: 'Character' },
  { href: '/review', label: 'Review' },
  { href: '/life-score', label: 'Score' },
  { href: '/settings', label: 'Settings' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 flex justify-around py-2 z-50">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[11px] px-2 py-1 rounded-md ${
              active ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
