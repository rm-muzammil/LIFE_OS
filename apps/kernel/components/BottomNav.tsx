'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  NotebookPen,
  Building2,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/life-score', label: 'Score', icon: TrendingUp },
  { href: '/character', label: 'Character', icon: Heart },
  { href: '/review', label: 'Review', icon: NotebookPen },
  { href: '/provinces', label: 'Provinces', icon: Building2 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur border-t border-zinc-900 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center h-16 overflow-x-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 h-full min-w-[64px] shrink-0 px-1 text-[10px] font-medium transition-colors',
                active ? 'text-brand-400' : 'text-zinc-600'
              )}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
        {session?.user && (
          <Link
            href="/settings"
            className={clsx(
              'flex flex-col items-center justify-center gap-1 h-full min-w-[64px] shrink-0 px-1 text-[10px] font-medium transition-colors',
              pathname === '/settings' ? 'text-brand-400' : 'text-zinc-600'
            )}
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'Profile'}
                className="w-5 h-5 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[9px] font-semibold">
                {(session.user.name ?? session.user.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            You
          </Link>
        )}
      </div>
    </nav>
  );
}
