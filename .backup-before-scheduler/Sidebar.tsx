'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  NotebookPen,
  BookOpen,
  Building2,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/life-score', label: 'Life Score', icon: TrendingUp },
  { href: '/character', label: 'Character', icon: Heart },
  { href: '/review', label: 'Weekly Review', icon: NotebookPen },
  { href: '/hadith', label: 'Hadith', icon: BookOpen },
  { href: '/provinces', label: 'Provinces', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-zinc-900 shrink-0">
      <div className="px-6 py-6 border-b border-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-100">
          Self-<span className="text-brand-400">Khilafah</span>
        </h1>
        <p className="text-xs text-zinc-600 mt-1">Life governance kernel</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-zinc-900 text-[11px] text-zinc-700 leading-relaxed">
        Build wealth → Politics → Real Khilafah.
        <br />
        Not guaranteed. Committed regardless.
      </div>
    </aside>
  );
}
