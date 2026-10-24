'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Apple, Dumbbell, Moon, Settings } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { href: '/personal', label: 'Overview', icon: Activity },
  { href: '/personal/training', label: 'Training', icon: Dumbbell },
  { href: '/personal/nutrition', label: 'Nutrition', icon: Apple },
  { href: '/personal/recovery', label: 'Recovery', icon: Moon },
  { href: '/personal/settings', label: 'Settings', icon: Settings },
];

export default function PersonalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Personal" className="flex gap-2 overflow-x-auto pb-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== '/personal' && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
              active
                ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
