'use client';

import clsx from 'clsx';
import { Check, Flag, RotateCcw } from 'lucide-react';
import type { ScheduledTask } from '@/lib/types';

const PROVINCE_COLORS: Record<string, string> = {
  faith: 'bg-emerald-500/10 text-emerald-400',
  personal: 'bg-blue-500/10 text-blue-400',
  work: 'bg-amber-500/10 text-amber-400',
  roadmap: 'bg-purple-500/10 text-purple-400',
  wealth: 'bg-yellow-500/10 text-yellow-400',
  relationships: 'bg-pink-500/10 text-pink-400',
  sk: 'bg-brand-500/10 text-brand-400',
};

export default function TaskCard({
  task,
  onMarkDone,
}: {
  task: ScheduledTask;
  onMarkDone: (id: string) => void;
}) {
  const isMissed = task.status === 'missed';
  const isDone = task.status === 'done';
  const isRescheduled = task.status === 'rescheduled';

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        isMissed
          ? 'border-red-900/50 bg-red-950/20'
          : isDone
          ? 'border-zinc-900 bg-zinc-950/40 opacity-60'
          : 'border-zinc-900 bg-zinc-900/40'
      )}
    >
      <button
        onClick={() => onMarkDone(task.id)}
        disabled={isDone}
        className={clsx(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          isDone
            ? 'border-brand-500 bg-brand-500 text-zinc-950'
            : isMissed
            ? 'border-red-800 text-red-800'
            : 'border-zinc-700 text-transparent hover:border-brand-400'
        )}
      >
        <Check size={12} strokeWidth={3} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-100">{task.title}</span>
          <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium', PROVINCE_COLORS[task.province])}>
            {task.province}
          </span>
          {isMissed && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-red-500">
              <Flag size={10} /> missed
            </span>
          )}
          {isRescheduled && task.originalTime && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <RotateCcw size={10} />
              <span className="line-through">{task.originalTime}</span> → {task.time}
            </span>
          )}
        </div>
        {task.description && <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>}
        <p className="text-[11px] text-zinc-600 mt-1">
          {task.timeLabel} · {task.time} PKT
        </p>
      </div>
    </div>
  );
}
