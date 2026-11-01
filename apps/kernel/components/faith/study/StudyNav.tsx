'use client';

import Link from 'next/link';

const links = [
  { href: '/faith/quran', label: 'Quran' },
  { href: '/faith/raku', label: 'Raku' },
  { href: '/faith/vocab', label: 'Vocabulary' },
] as const;

export default function StudyNav({ active }: { active: (typeof links)[number]['href'] }) {
  return (
    <nav aria-label="Faith study" className="flex flex-wrap gap-2">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? 'page' : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            active === href
              ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
