'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import RelationshipsError from '@/components/relationships/RelationshipsError';
import ScoreRing from '@/components/relationships/ScoreRing';
import { readRelationshipsResponse } from '@/lib/relationships/client';
import { POINTS } from '@/lib/relationships/scoring';
import { todayPKT } from '@/lib/relationships/date';
import type { RelationshipsReport } from '@/lib/relationships/types';

const LABELS: Record<keyof typeof POINTS, string> = {
  contactedParents: 'Contacted parents',
  familyTies: 'Maintained family ties',
  helpedSomeone: 'Helped someone',
  goodDeed: 'Good deed done',
  communityObligation: 'Community obligation',
};

export default function RelationshipsDashboardPage() {
  const [report, setReport] = useState<RelationshipsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/relationships/score', { cache: 'no-store' });
        const data = await readRelationshipsResponse<RelationshipsReport>(response);
        if (active) setReport(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Relationships.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const items = report
    ? (Object.keys(POINTS) as (keyof typeof POINTS)[]).map((key) => ({
        key,
        label: LABELS[key],
        points: POINTS[key],
        done: report.details[key],
      }))
    : [];
  const today = todayPKT();

  return (
    <div className="space-y-6">
      <RelationshipsError message={error} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            {new Date(`${today}T00:00:00Z`).toLocaleDateString('en-US', {
              timeZone: 'UTC',
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-100">Daily overview</h2>
        </div>
        {report && (
          <p className="flex items-center gap-1 text-sm text-orange-300">
            <Flame size={15} /> {report.streak} day streak
          </p>
        )}
      </div>

      {loading ? (
        <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading today&apos;s score…</div>
      ) : report ? (
        <>
          <div className="card space-y-5 p-5">
            <ScoreRing
              items={items}
              weeklyBonusEarned={report.score > items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0)}
              totalScore={report.score}
              streak={report.streak}
            />
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                  <span className={`text-sm ${item.done ? 'text-zinc-100' : 'text-zinc-500'}`}>{item.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">{item.points} pts</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${item.done ? 'bg-brand-500 text-zinc-950' : 'border border-zinc-700 text-transparent'}`}>
                      ✓
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {report.details.charityAmount > 0 && (
              <div className="card p-4">
                <p className="text-xs text-zinc-500">Charity today</p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">₨ {report.details.charityAmount.toLocaleString()}</p>
              </div>
            )}
            {report.details.goodDeedsCount > 0 && (
              <div className="card p-4">
                <p className="text-xs text-zinc-500">Good deeds</p>
                <p className="mt-1 text-lg font-semibold text-zinc-100">{report.details.goodDeedsCount}</p>
              </div>
            )}
          </div>

          <Link href="/relationships/log" className="btn-primary flex w-full items-center justify-center gap-2 py-3">
            {report.todayDone ? 'Edit today’s log' : 'Log today'} <ArrowRight size={16} />
          </Link>
        </>
      ) : (
        <p className="card p-5 text-sm text-zinc-500">Today&apos;s score is unavailable.</p>
      )}
    </div>
  );
}
