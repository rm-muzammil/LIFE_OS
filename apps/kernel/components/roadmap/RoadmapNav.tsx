'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const LINKS = [
  { href: '/roadmap', label: 'Overview' },
  { href: '/roadmap/goals', label: 'Goals' },
  { href: '/roadmap/tasks', label: 'Tasks' },
  { href: '/roadmap/import', label: 'Import' },
];

export default function RoadmapNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Roadmap sections" className="mb-6 overflow-x-auto border-b border-zinc-800">
      <div className="flex min-w-max gap-1">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors',
                active
                  ? 'border-brand-500 font-medium text-brand-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200'
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
