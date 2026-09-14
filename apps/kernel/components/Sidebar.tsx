'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  NotebookPen,
  BookOpen,
  Building2,
  Settings,
  CalendarDays,
  MessageCircle,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/life-score', label: 'Life Score', icon: TrendingUp },
  { href: '/character', label: 'Character', icon: Heart },
  { href: '/review', label: 'Weekly Review', icon: NotebookPen },
  { href: '/hadith', label: 'Hadith', icon: BookOpen },
  { href: '/provinces', label: 'Provinces', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-zinc-900 shrink-0">
      {session?.user && (
        <div className="relative border-b border-zinc-900">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-zinc-900/60 transition-colors"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'Profile'}
                className="w-8 h-8 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold shrink-0">
                {(session.user.name ?? session.user.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-zinc-200 truncate">{session.user.name}</p>
              <p className="text-xs text-zinc-600 truncate">{session.user.email}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute left-4 right-4 top-full mt-1 z-20 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden">
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                <LogOut size={16} strokeWidth={2} />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
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
