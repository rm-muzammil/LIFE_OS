'use client';

import { Check, Trash2 } from 'lucide-react';
import type { RoadmapTask } from '@/db/schema';

const STATUS_OPTIONS = ['todo', 'done', 'skipped'] as const;

export default function RoadmapTaskRow({
  task,
  onStatus,
  onDelete,
}: {
  task: RoadmapTask;
  onStatus: (task: RoadmapTask, status: (typeof STATUS_OPTIONS)[number]) => void;
  onDelete: (task: RoadmapTask) => void;
}) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          task.status === 'done'
            ? 'border-brand-500 bg-brand-500 text-zinc-950'
            : 'border-zinc-700 text-transparent'
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-sm font-medium ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
            {task.title}
          </h3>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] capitalize text-zinc-400">{task.domain}</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] capitalize text-zinc-500">{task.priority}</span>
          {task.status === 'suggested' && <span className="text-[10px] text-violet-300">Suggested</span>}
        </div>
        {task.description && <p className="mt-1 text-xs text-zinc-500">{task.description}</p>}
        <p className="mt-1 text-xs text-zinc-600">
          {task.dueDate ? `Due ${task.dueDate}` : 'No due date'}
          {task.estimateMinutes ? ` · ${task.estimateMinutes} min` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          onChange={(event) => {
            const value = event.target.value;
            const status = STATUS_OPTIONS.find((option) => option === value);
            if (status) onStatus(task, status);
          }}
          className="input !w-auto !px-2 !py-1 text-xs capitalize"
        >
          <option value="todo">To do</option>
          <option value="done">Done</option>
          <option value="skipped">Skipped</option>
          {task.status === 'suggested' && <option value="suggested" disabled>Suggested</option>}
        </select>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
