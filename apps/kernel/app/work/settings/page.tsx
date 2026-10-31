'use client';

import { useEffect, useState } from 'react';
import WorkError from '@/components/work/WorkError';
import { readWorkResponse } from '@/lib/work/client';
import { SCORE_CAP } from '@/lib/work/score';
import type { WorkReport } from '@/lib/work/types';

const SCORE_ROWS = [
  { label: 'Deep work', value: 'Up to 4 hours', points: '25 pts' },
  { label: 'Tasks completed', value: 'Up to 5 tasks', points: '20 pts' },
  { label: 'Project milestone', value: 'When progress is made', points: '20 pts' },
  { label: 'Professional development', value: '30 minutes or more', points: '15 pts' },
  { label: 'No procrastination', value: 'When completed', points: '10 pts' },
  { label: 'Client / deliverable submitted', value: 'Bonus', points: '+10 pts' },
];

export default function WorkSettingsPage() {
  const [report, setReport] = useState<WorkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/work/report', { cache: 'no-store' });
        const data = await readWorkResponse<WorkReport>(response);
        if (active) setReport(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Work score.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <WorkError message={error} />
      <section className="card flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-zinc-500">Current score</p>
          {loading ? (
            <p role="status" className="mt-1 text-sm text-zinc-600">Calculating…</p>
          ) : report ? (
            <p className="mt-1 text-2xl font-semibold text-brand-300">{report.score}<span className="text-sm text-zinc-500">/100</span></p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Score unavailable</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Streak</p>
          <p className="mt-1 text-lg font-medium text-zinc-100">{report ? `${report.streak} days` : '—'}</p>
        </div>
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Work scoring</h2>
        <p className="text-sm leading-relaxed text-zinc-500">
          Daily career output is scored from deep work, completed tasks, project progress,
          professional development, focus, and submitted deliverables. The total is rounded
          to a whole point and capped at 100.
        </p>
      </section>
      <section className="card divide-y divide-zinc-800">
        {SCORE_ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="text-zinc-200">{row.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{row.value}</p>
            </div>
            <span className="shrink-0 font-medium text-brand-300">{row.points}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-zinc-200">Maximum score</span>
          <span className="font-medium text-zinc-400">{SCORE_CAP} pts</span>
        </div>
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">About Work</h2>
        <p className="text-sm leading-relaxed text-zinc-500">
          Track daily career output, projects, milestones, and professional development.
          Your logs and project details are private to your signed-in account.
        </p>
      </section>
    </div>
  );
}
