'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { plannerRequest } from '@/lib/planner/client';
import { formatMinutesAsTime } from '@/lib/planner/time';
import type {
  PlannerBlock,
  PlannerOverlapWarning,
  PlannerSettings,
  PrayerTimesResult,
} from '@/lib/planner/types';
import type { FreeGap } from '@/lib/planner/types';

interface TodayData {
  date: string;
  blocks: PlannerBlock[];
  gaps: FreeGap[];
  warnings: PlannerOverlapWarning[];
  settings: PlannerSettings;
  prayers: PrayerTimesResult;
}

function sourceLabel(source: PrayerTimesResult['source']) {
  if (source === 'auto') return 'auto';
  return source === 'manual' ? 'manual fallback' : 'default';
}

export default function PlannerTodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    plannerRequest<TodayData>('/api/planner/today', { cache: 'no-store' })
      .then((value) => { if (active) setData(value); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load planner.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const entries = data
    ? [
        ...data.blocks.map((block) => ({ kind: 'block' as const, start: block.startMinute, block })),
        ...data.gaps.map((gap) => ({ kind: 'gap' as const, start: gap.startMinute, gap })),
      ].sort((a, b) => a.start - b.start)
    : [];
  const prayers = data?.blocks.filter((block) => block.kind === 'prayer') ?? [];

  return (
    <div className="space-y-5">
      {loading && <p role="status" className="text-sm text-zinc-500">Loading today’s fixed blocks…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}

      {data && (
        <>
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Today’s fixed blocks</h2>
                <p className="mt-1 text-sm text-zinc-500">{data.date} · Asia/Karachi</p>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                Prayer times: {sourceLabel(data.prayers.source)}
              </span>
            </div>

            {data.settings.prayerAuto && data.prayers.source !== 'auto' && (
              <p role="status" className="text-xs text-amber-300">
                Automatic lookup failed; {data.prayers.source === 'manual' ? 'manual' : 'default'} fallback is in use.
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-5">
              {prayers.map((prayer) => {
                const name = prayer.prayer!;
                const time = data.prayers[name];
                return (
                  <div key={prayer.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-xs capitalize text-zinc-500">{name}</p>
                    <p className="mt-1 font-mono text-sm text-zinc-100">{time}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {name === 'dhuhr' && data.prayers.isFriday
                        ? data.settings.jumuahBlockMinutes
                        : data.settings.prayerBlockMinutes} min + {data.settings.prayerBufferBeforeMinutes} min buffer
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {data.warnings.length > 0 && (
            <section aria-label="Schedule warnings" className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
              <h2 className="flex items-center gap-2 text-sm font-medium text-amber-300">
                <AlertTriangle size={16} /> Overlap warnings
              </h2>
              <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
                {data.warnings.map((warning) => (
                  <li key={`${warning.firstBlockId}-${warning.secondBlockId}`}>{warning.message}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-200">Timeline</h2>
            {entries.length === 0 ? (
              <p className="text-sm text-zinc-500">No blocks or gaps are available.</p>
            ) : (
              <ol className="space-y-2">
                {entries.map((entry) => entry.kind === 'block' ? (
                  <li key={`block-${entry.block.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
                    <Clock3 size={15} className="shrink-0 text-brand-400" />
                    <span className="w-24 shrink-0 font-mono text-xs text-zinc-500">
                      {formatMinutesAsTime(entry.block.startMinute)}–{formatMinutesAsTime(entry.block.endMinute)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{entry.block.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">{entry.block.kind}</span>
                  </li>
                ) : (
                  <li key={`gap-${entry.gap.startMinute}-${entry.gap.endMinute}`} className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-3 py-2.5">
                    <span className="w-24 shrink-0 font-mono text-xs text-zinc-600">
                      {formatMinutesAsTime(entry.gap.startMinute)}–{formatMinutesAsTime(entry.gap.endMinute)}
                    </span>
                    <span className="text-xs text-zinc-500">Free · {entry.gap.minutes} min</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
