'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import WorkError from '@/components/work/WorkError';
import ScoreRing from '@/components/work/ScoreRing';
import StatCard from '@/components/work/StatCard';
import { readWorkResponse } from '@/lib/work/client';
import { formatShort, todayPKT } from '@/lib/work/date';
import type { DailyLog, WorkReport } from '@/lib/work/types';

type DashboardData = {
  report: WorkReport;
  logs: DailyLog[];
};

export default function WorkDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [reportResponse, logsResponse] = await Promise.all([
          fetch('/api/work/report', { cache: 'no-store' }),
          fetch('/api/work/log?limit=14', { cache: 'no-store' }),
        ]);
        const [report, logsData] = await Promise.all([
          readWorkResponse<WorkReport>(reportResponse),
          readWorkResponse<{ logs: DailyLog[] }>(logsResponse),
        ]);
        if (active) setData({ report, logs: logsData.logs });
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Work overview.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const report = data?.report;
  const details = report?.details;
  const today = todayPKT();
  const hasTodayLog = data?.logs.some((log) => log.logDate === today) ?? false;

  return (
    <div className="space-y-6">
      <WorkError message={error} />
      <header className="flex flex-wrap items-end justify-between gap-3">
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
        {report && <p className="text-sm text-zinc-500">{report.streak} day streak</p>}
      </header>

      {loading ? (
        <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading Work overview…</div>
      ) : report ? (
        <>
          <section className="grain-surface card space-y-5 py-6">
            <ScoreRing score={report.score} streak={report.streak} />
            {!hasTodayLog && (
              <p className="text-center text-sm text-zinc-500">
                Nothing logged yet today.{' '}
                <Link href="/work/log" className="font-medium text-brand-300 underline underline-offset-2">Log today</Link>
              </p>
            )}
          </section>

          {details && hasTodayLog && (
            <section className="grid grid-cols-2 gap-3">
              <StatCard label="Deep work" value={`${details.deepWorkHours}h`} sub="Target 4h" />
              <StatCard label="Tasks" value={`${details.tasksCompleted}`} sub="Target 5" />
              <StatCard label="Milestone" value={details.milestoneDone ? 'Done' : '—'} ok={details.milestoneDone} />
              <StatCard label="Prof. dev" value={`${details.profDevMinutes}m`} sub="Target 30m" />
              <StatCard label="No procrastination" value={details.noProcrastination ? 'Yes' : 'No'} ok={details.noProcrastination} />
              <StatCard label="Deliverable" value={details.clientDeliverable ? 'Submitted' : '—'} ok={details.clientDeliverable} />
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Last 14 days</h3>
              <Link href="/work/log" className="text-xs font-medium text-brand-300">Edit today <ArrowRight size={13} className="ml-1 inline" /></Link>
            </div>
            {data.logs.length === 0 ? (
              <p className="card border-dashed p-5 text-center text-sm text-zinc-500">No entries yet. Your first log starts the streak.</p>
            ) : (
              <ol className="space-y-2">
                {data.logs.map((log) => (
                  <li key={log.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-zinc-400">{formatShort(log.logDate)}</span>
                    <span className="flex items-center gap-3">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, log.score)}%` }} />
                      </span>
                      <span className="w-8 text-right text-sm font-medium tabular-nums text-zinc-200">{log.score}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : (
        <p className="card p-5 text-sm text-zinc-500">Work overview is unavailable.</p>
      )}
    </div>
  );
}
