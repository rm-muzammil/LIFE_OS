'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DhikrCounter } from '@/components/faith/ui/DhikrCounter';

interface CountRow {
  dhikrKey: string;
  count: number;
  completed: boolean;
}

const counters = [
  {
    key: 'la_ilaha',
    arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ',
    transliteration: 'La ilaha illallah',
    translation: 'There is no deity worthy of worship except Allah.',
  },
  {
    key: 'subhanallah',
    arabic: 'سُبْحَانَ اللّٰهِ',
    transliteration: 'Subhanallah',
    translation: 'Glory be to Allah.',
  },
];

export default function DhikrCounterPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/faith/dhikr-count?date=${today}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load counters.');
        return (await response.json()) as CountRow[];
      })
      .then((rows) => {
        if (active) setCounts(rows);
      })
      .catch(() => {
        if (active) setError('Could not load saved counters. New counts can still be recorded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [today]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-4 animate-fade-in">
      <header className="flex items-center gap-3">
        <button
          onClick={() => router.push('/faith/dhikr')}
          className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-all"
          aria-label="Back to Dhikr"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Daily Counters</h1>
          <p className="text-xs text-zinc-500">العداد اليومي</p>
        </div>
      </header>
      {loading && <p role="status" className="text-sm text-zinc-500">Loading saved counts…</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {!loading && counters.map((counter) => {
        const row = counts.find((item) => item.dhikrKey === counter.key);
        return (
          <DhikrCounter
            key={counter.key}
            dhikrKey={counter.key}
            arabic={counter.arabic}
            transliteration={counter.transliteration}
            translation={counter.translation}
            target={100}
            date={today}
            initialCount={row?.count ?? 0}
            initialCompleted={row?.completed ?? false}
          />
        );
      })}
    </div>
  );
}
