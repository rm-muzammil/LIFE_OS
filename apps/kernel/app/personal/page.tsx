'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Dumbbell, Flame, Moon, Utensils } from 'lucide-react';
import ActivityGrid from '@/components/personal/ActivityGrid';
import PersonalError from '@/components/personal/PersonalError';
import ScoreRing from '@/components/personal/ScoreRing';
import { todayISO } from '@/lib/personal/scoring';
import type { PersonalReport } from '@/lib/personal/types';

interface DailyLogRow {
  date: string;
  totalScore: number | null;
  calories?: number | null;
  protein?: number | null;
  sleepHours?: number | null;
  workoutDone?: boolean | null;
}

interface PlanRow {
  plan: { focus?: string } | null;
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status})`);
  }
  return data as T;
}

export default function PersonalDashboardPage() {
  const today = todayISO();
  const [log, setLog] = useState<DailyLogRow | null>(null);
  const [history, setHistory] = useState<DailyLogRow[]>([]);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [report, setReport] = useState<PersonalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [logData, historyData, planData, reportData] = await Promise.all([
          fetch(`/api/personal/daily-log?date=${encodeURIComponent(today)}`, { cache: 'no-store' })
            .then(readResponse<DailyLogRow | null>),
          fetch('/api/personal/stats', { cache: 'no-store' }).then(readResponse<DailyLogRow[]>),
          fetch(`/api/personal/workout-plans?date=${encodeURIComponent(today)}`, { cache: 'no-store' })
            .then(readResponse<{ plan: PlanRow } | null>),
          fetch('/api/personal/report', { cache: 'no-store' }).then(readResponse<PersonalReport>),
        ]);
        if (!active) return;
        setLog(logData);
        setHistory(historyData);
        setPlan(planData?.plan ?? null);
        setReport(reportData);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load Personal data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [today]);

  const score = log?.totalScore ?? 0;
  const focus = plan?.plan?.focus;
  return (
    <div className="space-y-6">
      <PersonalError message={error} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-100">Daily overview</h2>
        </div>
        {loading ? (
          <div role="status" className="text-sm text-zinc-500">Loading today&apos;s score…</div>
        ) : (
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {score}<span className="text-base text-zinc-500">/100</span>
              </p>
              <p className="text-sm text-zinc-500">Today&apos;s score</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-orange-300">
                <Flame size={15} /> {report?.streak ?? 0} day streak
              </p>
            </div>
          </div>
        )}
      </div>

      {!loading && !log && (
        <p className="text-sm text-zinc-500">No daily log yet. Your score will appear after your first save.</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Calories', value: log?.calories ?? 0, unit: 'kcal', icon: Utensils },
          { label: 'Protein', value: log?.protein ?? 0, unit: 'g', icon: Activity },
          { label: 'Sleep', value: log?.sleepHours ?? 0, unit: 'h', icon: Moon },
        ].map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="card p-3">
            <Icon size={16} className="text-brand-400" />
            <p className="mt-2 text-lg font-semibold text-zinc-100">{value}<span className="ml-1 text-xs text-zinc-500">{unit}</span></p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card flex items-start justify-between gap-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Today&apos;s training</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {log?.workoutDone ? 'Workout completed' : focus ?? 'No plan generated yet'}
          </p>
        </div>
        <Link href="/personal/training" className="text-sm text-brand-300 hover:text-brand-200">Open</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/personal/training', label: 'Training', icon: Dumbbell },
          { href: '/personal/nutrition', label: 'Nutrition', icon: Utensils },
          { href: '/personal/recovery', label: 'Recovery', icon: Moon },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="card card-hover flex items-center gap-3 p-4 text-sm text-zinc-300">
            <Icon size={18} className="text-brand-400" /> {label}
          </Link>
        ))}
      </div>

      <section className="card space-y-3 p-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300">Activity · last 90 days</h3>
          <p className="mt-1 text-xs text-zinc-600">Daily scores shown in the calendar grid.</p>
        </div>
        <ActivityGrid data={history} />
      </section>
    </div>
  );
}
