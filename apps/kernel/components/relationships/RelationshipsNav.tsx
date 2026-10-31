'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, NotebookPen, Settings } from 'lucide-react';
import clsx from 'clsx';

const LINKS = [
  { href: '/relationships', label: 'Overview', icon: Home },
  { href: '/relationships/log', label: 'Daily log', icon: NotebookPen },
  { href: '/relationships/history', label: 'History', icon: CalendarDays },
  { href: '/relationships/settings', label: 'Settings', icon: Settings },
];

export default function RelationshipsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Relationships sections" className="mb-6 overflow-x-auto border-b border-zinc-800">
      <div className="flex min-w-max gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors',
                active
                  ? 'border-brand-500 font-medium text-brand-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
