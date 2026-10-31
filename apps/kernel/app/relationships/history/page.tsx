'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RelationshipsError from '@/components/relationships/RelationshipsError';
import { readRelationshipsResponse } from '@/lib/relationships/client';
import { formatHuman } from '@/lib/relationships/date';
import { BASE_MAX } from '@/lib/relationships/scoring';

type Entry = {
  date: string;
  score: number;
  charityAmount: number;
  goodDeedsCount: number;
};
type HistoryResponse = { entries: Entry[] };

export default function RelationshipsHistoryPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setEntries(null);
      setError(null);
      try {
        const response = await fetch(`/api/relationships/history?days=${days}`, { cache: 'no-store' });
        const data = await readRelationshipsResponse<HistoryResponse>(response);
        if (active) setEntries(data.entries);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Relationships history.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [days]);

  const totalCharity = entries?.reduce((sum, entry) => sum + entry.charityAmount, 0) ?? 0;
  const totalGoodDeeds = entries?.reduce((sum, entry) => sum + entry.goodDeedsCount, 0) ?? 0;
  const average = entries?.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
    : 0;

  return (
    <div className="space-y-5">
      <RelationshipsError message={error} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Last {days} days</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-100">History</h2>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDays(period)}
              aria-pressed={days === period}
              className={`rounded-xl border px-3 py-2 text-xs ${
                days === period
                  ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {period}d
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Avg score" value={String(average)} />
        <Stat label="Charity" value={`₨${totalCharity.toLocaleString()}`} />
        <Stat label="Good deeds" value={String(totalGoodDeeds)} />
      </div>

      {entries === null ? (
        <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading history…</div>
      ) : entries.length === 0 ? (
        <div className="card space-y-3 p-8 text-center">
          <p className="text-sm text-zinc-500">Nothing logged in this time window.</p>
          <Link href="/relationships/log" className="text-sm font-medium text-brand-300 hover:text-brand-200">
            Log today
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.date}>
              <Link
                href={`/relationships/log?date=${encodeURIComponent(entry.date)}`}
                className="card card-hover flex items-center gap-3 px-4 py-3"
              >
                <span className="w-20 shrink-0 text-xs text-zinc-500">{formatHuman(entry.date)}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, (entry.score / BASE_MAX) * 100)}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-sm tabular-nums text-zinc-200">{entry.score}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
