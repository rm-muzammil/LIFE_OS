'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Heart, NotebookPen, Building2 } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/life-score', label: 'Score', icon: TrendingUp },
  { href: '/character', label: 'Character', icon: Heart },
  { href: '/review', label: 'Review', icon: NotebookPen },
  { href: '/provinces', label: 'Provinces', icon: Building2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur border-t border-zinc-900 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-medium transition-colors',
                active ? 'text-brand-400' : 'text-zinc-600'
              )}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
