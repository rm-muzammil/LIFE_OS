'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Moon, Star, Sun } from 'lucide-react';
import {
  BEFORE_SLEEP_ADHKAR,
  EVENING_ADHKAR,
  MORNING_ADHKAR,
} from '@/lib/faith/adhkar';

interface DhikrCount {
  dhikrKey: string;
  count: number;
  completed: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function DhikrHubPage() {
  const [counts, setCounts] = useState<DhikrCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/faith/dhikr-count?date=${today()}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load Dhikr counts.');
        return (await response.json()) as DhikrCount[];
      })
      .then((rows) => {
        if (active) setCounts(rows);
      })
      .catch(() => {
        if (active) setError('Could not load today’s saved counts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const doneKeys = new Set(
    counts.filter((row) => row.completed).map((row) => row.dhikrKey)
  );
  const sections = [
    {
      href: '/faith/dhikr/morning',
      label: 'Morning Adhkar',
      labelAr: 'أذكار الصباح',
      icon: Sun,
      done: MORNING_ADHKAR.filter((item) => doneKeys.has(item.key)).length,
      total: MORNING_ADHKAR.length,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      href: '/faith/dhikr/evening',
      label: 'Evening Adhkar',
      labelAr: 'أذكار المساء',
      icon: Moon,
      done: EVENING_ADHKAR.filter((item) => doneKeys.has(item.key)).length,
      total: EVENING_ADHKAR.length,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      href: '/faith/dhikr/sleep',
      label: 'Before Sleep',
      labelAr: 'أذكار النوم',
      icon: Star,
      done: BEFORE_SLEEP_ADHKAR.filter((item) => doneKeys.has(item.key)).length,
      total: BEFORE_SLEEP_ADHKAR.length,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <header>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Daily</p>
        <h1 className="text-xl font-bold text-zinc-100">Adhkar &amp; Dhikr</h1>
        <p className="text-xs text-zinc-500 mt-1">{today()}</p>
      </header>

      {loading && <p role="status" className="text-sm text-zinc-500">Loading today’s progress…</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {sections.map(({ href, label, labelAr, icon: Icon, done, total, color, bg }) => {
          const allDone = done === total;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${allDone ? bg : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allDone ? bg : 'bg-zinc-800'}`}>
                  <Icon className={`w-5 h-5 ${allDone ? color : 'text-zinc-500'}`} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-500 arabic-text" dir="rtl">{labelAr}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono ${allDone ? color : 'text-zinc-400'}`}>
                    {done}/{total}
                  </p>
                  <p className="text-[10px] text-zinc-600">completed</p>
                </div>
                {allDone
                  ? <CheckCircle2 className={`w-5 h-5 ${color}`} />
                  : <Circle className="w-5 h-5 text-zinc-700" />}
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/faith/dhikr/counter" className="btn-secondary block text-center">
        Open daily counters
      </Link>
    </div>
  );
}
