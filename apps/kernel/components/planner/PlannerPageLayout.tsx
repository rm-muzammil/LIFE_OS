'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/planner', label: 'Today' },
  { href: '/planner/timetable', label: 'Timetable' },
  { href: '/planner/tracks', label: 'Learning tracks' },
  { href: '/planner/settings', label: 'Settings' },
];

export default function PlannerPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="planner-app mx-auto max-w-5xl space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Time manager</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">Planner</h1>
        </div>
        <nav aria-label="Planner sections" className="flex gap-2 overflow-x-auto border-b border-zinc-800">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-brand-500 text-brand-300'
                    : 'border-transparent text-zinc-400 hover:border-brand-500/60 hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
