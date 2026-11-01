'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDot, Flag, ListTodo } from 'lucide-react';
import RoadmapError from '@/components/roadmap/RoadmapError';
import RoadmapTaskRow from '@/components/roadmap/RoadmapTaskRow';
import { jsonBody, roadmapRequest } from '@/lib/roadmap/client';
import type { RoadmapGoal, RoadmapMilestone, RoadmapTask } from '@/db/schema';

interface Overview {
  empty: boolean;
  progress: {
    goals: { total: number; done: number };
    milestones: { total: number; done: number };
    tasks: { total: number; done: number };
  };
  dueToday: RoadmapTask[];
  overdue: RoadmapTask[];
  upcomingTasks: RoadmapTask[];
  upcomingMilestones: RoadmapMilestone[];
  goals: RoadmapGoal[];
}

export default function RoadmapOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setOverview(await roadmapRequest<Overview>('/api/roadmap/overview', { cache: 'no-store' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Roadmap.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function changeStatus(task: RoadmapTask, status: 'todo' | 'done' | 'skipped') {
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/tasks/${task.id}`, {
        method: 'PATCH',
        ...jsonBody({ status }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task.');
    }
  }

  async function removeTask(task: RoadmapTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/tasks/${task.id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task.');
    }
  }

  const sections = overview
    ? [
        { title: 'Due today', tasks: overview.dueToday, tone: 'text-brand-300' },
        { title: 'Overdue', tasks: overview.overdue, tone: 'text-red-300' },
        { title: 'Next 7 days', tasks: overview.upcomingTasks, tone: 'text-zinc-300' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <RoadmapError message={error} />
      {loading ? (
        <p role="status" className="text-sm text-zinc-500">Loading your roadmap…</p>
      ) : overview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ProgressCard label="Goals" done={overview.progress.goals.done} total={overview.progress.goals.total} icon={Flag} />
            <ProgressCard label="Milestones" done={overview.progress.milestones.done} total={overview.progress.milestones.total} icon={CircleDot} />
            <ProgressCard label="Tasks" done={overview.progress.tasks.done} total={overview.progress.tasks.total} icon={ListTodo} />
          </div>

          {overview.empty && (
            <section className="card space-y-3 p-6 text-center">
              <h2 className="text-lg font-semibold text-zinc-100">Start with a goal</h2>
              <p className="text-sm text-zinc-500">Add a goal and break it into milestones and actionable tasks.</p>
              <Link href="/roadmap/goals" className="btn-primary inline-flex">Create a goal</Link>
            </section>
          )}

          {sections.map(({ title, tasks, tone }) => (
            <section key={title} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${tone}`}>{title}</h2>
                <span className="text-xs text-zinc-600">{tasks.length}</span>
              </div>
              {tasks.length === 0 ? (
                <p className="card px-4 py-3 text-sm text-zinc-600">Nothing here.</p>
              ) : (
                tasks.map((task) => (
                  <RoadmapTaskRow
                    key={task.id}
                    task={task}
                    onStatus={(row, status) => void changeStatus(row, status)}
                    onDelete={(row) => void removeTask(row)}
                  />
                ))
              )}
            </section>
          ))}

          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Goals</h2>
              <Link href="/roadmap/goals" className="inline-flex items-center gap-1 text-xs text-brand-300">
                Manage <ArrowRight size={14} />
              </Link>
            </div>
            {overview.goals.length === 0 ? (
              <p className="text-sm text-zinc-500">No goals yet.</p>
            ) : (
              <div className="space-y-3">
                {overview.goals.slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-200">{goal.title}</p>
                      <p className="mt-0.5 text-xs capitalize text-zinc-600">{goal.domain} · {goal.status}</p>
                    </div>
                    {goal.dueDate && <span className="shrink-0 text-xs text-zinc-500">{goal.dueDate}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {overview.upcomingMilestones.length > 0 && (
            <section className="card space-y-3 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">Upcoming milestones</h2>
              {overview.upcomingMilestones.map((milestone) => (
                <div key={milestone.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-zinc-300">{milestone.title}</span>
                  <span className="text-zinc-600">{milestone.dueDate}</span>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">Roadmap data is unavailable.</p>
      )}
    </div>
  );
}

function ProgressCard({
  label,
  done,
  total,
  icon: Icon,
}: {
  label: string;
  done: number;
  total: number;
  icon: typeof Flag;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <Icon size={16} className="text-brand-400" />
      </div>
      <p className="mt-2 text-xl font-semibold text-zinc-100">{done}<span className="text-sm text-zinc-600">/{total}</span></p>
      {total > 0 && (
        <div className="mt-3 h-1 rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
