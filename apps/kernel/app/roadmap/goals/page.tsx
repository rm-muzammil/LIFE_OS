'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import RoadmapError from '@/components/roadmap/RoadmapError';
import RoadmapTaskRow from '@/components/roadmap/RoadmapTaskRow';
import { jsonBody, roadmapRequest } from '@/lib/roadmap/client';
import {
  ROADMAP_DOMAINS,
  type RoadmapDomain,
  type RoadmapGoalStatus,
  type RoadmapPriority,
} from '@/lib/roadmap/types';
import type { RoadmapGoal, RoadmapMilestone, RoadmapTask } from '@/db/schema';

interface GoalDetail {
  goal: RoadmapGoal;
  milestones: RoadmapMilestone[];
  tasks: RoadmapTask[];
}

interface DeleteCounts {
  goals?: number;
  milestones?: number;
  tasks: number;
  completedTasks: number;
}

interface DeleteRequest {
  kind: 'goal' | 'milestone';
  id: string;
  counts: DeleteCounts;
}

const FIELD = 'input';

export default function RoadmapGoalsPage() {
  const [goals, setGoals] = useState<RoadmapGoal[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<RoadmapDomain>('other');
  const [priority, setPriority] = useState<RoadmapPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);

  const refresh = useCallback(async (preferredId?: string) => {
    setError(null);
    try {
      const result = await roadmapRequest<{ goals: RoadmapGoal[] }>('/api/roadmap/goals', { cache: 'no-store' });
      setGoals(result.goals);
      const nextId = preferredId ?? selectedId;
      const exists = result.goals.some((goal) => goal.id === nextId);
      const resolvedId = exists ? nextId : result.goals[0]?.id ?? '';
      setSelectedId(resolvedId);
      if (resolvedId) {
        const detailResult = await roadmapRequest<GoalDetail>(`/api/roadmap/goals/${resolvedId}`, { cache: 'no-store' });
        setDetail(detailResult);
      } else {
        setDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load goals.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function selectGoal(id: string) {
    setSelectedId(id);
    setError(null);
    try {
      setDetail(await roadmapRequest<GoalDetail>(`/api/roadmap/goals/${id}`, { cache: 'no-store' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load goal details.');
    }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await roadmapRequest<{ goal: RoadmapGoal }>('/api/roadmap/goals', {
        method: 'POST',
        ...jsonBody({ title, domain, priority, dueDate: dueDate || null }),
      });
      setTitle('');
      setDueDate('');
      setMessage('Goal created.');
      await refresh(result.goal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create goal.');
    } finally {
      setSaving(false);
    }
  }

  async function createMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await roadmapRequest('/api/roadmap/milestones', {
        method: 'POST',
        ...jsonBody({ goalId: selectedId, title: milestoneTitle, domain: detail?.goal.domain ?? 'other' }),
      });
      setMilestoneTitle('');
      setMessage('Milestone added.');
      await refresh(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create milestone.');
    } finally {
      setSaving(false);
    }
  }

  async function updateGoalStatus(goal: RoadmapGoal, status: RoadmapGoalStatus) {
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/goals/${goal.id}`, {
        method: 'PATCH',
        ...jsonBody({ status }),
      });
      await refresh(goal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update goal.');
    }
  }

  async function updateMilestoneStatus(milestone: RoadmapMilestone, status: RoadmapGoalStatus) {
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/milestones/${milestone.id}`, {
        method: 'PATCH',
        ...jsonBody({ status }),
      });
      await refresh(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update milestone.');
    }
  }

  async function changeTaskStatus(task: RoadmapTask, status: 'todo' | 'done' | 'skipped') {
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/tasks/${task.id}`, { method: 'PATCH', ...jsonBody({ status }) });
      await refresh(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task.');
    }
  }

  async function requestDelete(kind: DeleteRequest['kind'], id: string) {
    setError(null);
    try {
      const result = await roadmapRequest<{ confirmRequired?: boolean; counts: DeleteCounts }>(
        `/api/roadmap/${kind === 'goal' ? 'goals' : 'milestones'}/${id}`,
        { method: 'DELETE' }
      );
      if (result.confirmRequired) setDeleteRequest({ kind, id, counts: result.counts });
      else await refresh(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare delete.');
    }
  }

  async function confirmDelete() {
    if (!deleteRequest) return;
    setDeleting(true);
    setError(null);
    try {
      const resource = deleteRequest.kind === 'goal' ? 'goals' : 'milestones';
      await roadmapRequest(`/api/roadmap/${resource}/${deleteRequest.id}`, {
        method: 'DELETE',
        ...jsonBody({ confirm: true }),
      });
      setDeleteRequest(null);
      await refresh(deleteRequest.kind === 'goal' ? undefined : selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete roadmap items.');
    } finally {
      setDeleting(false);
    }
  }

  async function deleteTask(task: RoadmapTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try {
      await roadmapRequest(`/api/roadmap/tasks/${task.id}`, { method: 'DELETE' });
      await refresh(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task.');
    }
  }

  return (
    <div className="space-y-5">
      <RoadmapError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}

      <form onSubmit={createGoal} className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-zinc-200">Create a goal</h2>
        <label className="sm:col-span-2">
          <span className="label">Title</span>
          <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={FIELD} />
        </label>
        <label>
          <span className="label">Domain</span>
          <select value={domain} onChange={(event) => setDomain(event.target.value as RoadmapDomain)} className={FIELD}>
            {ROADMAP_DOMAINS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as RoadmapPriority)} className={FIELD}>
            {(['low', 'medium', 'high'] as const).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Due date</span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={FIELD} />
        </label>
        <button type="submit" disabled={saving} className="btn-primary self-end">
          <Plus className="mr-1 inline" size={16} /> {saving ? 'Creating…' : 'Create goal'}
        </button>
      </form>

      {loading ? <p className="text-sm text-zinc-500">Loading goals…</p> : goals.length === 0 ? (
        <p className="card p-5 text-sm text-zinc-500">No goals yet. Create one above to get started.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.8fr)]">
          <aside className="card h-fit space-y-1 p-3">
            {goals.map((goal) => (
              <button
                type="button"
                key={goal.id}
                onClick={() => void selectGoal(goal.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left ${
                  selectedId === goal.id ? 'bg-brand-500/10 text-brand-300' : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span className="block truncate text-sm font-medium">{goal.title}</span>
                <span className="mt-1 block text-xs capitalize text-zinc-600">{goal.domain} · {goal.status}</span>
              </button>
            ))}
          </aside>

          {detail && (
            <section className="space-y-4">
              <div className="card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">{detail.goal.title}</h2>
                    {detail.goal.description && <p className="mt-1 text-sm text-zinc-500">{detail.goal.description}</p>}
                    <p className="mt-1 text-xs capitalize text-zinc-600">
                      {detail.goal.domain} · {detail.goal.priority}
                      {detail.goal.dueDate ? ` · Due ${detail.goal.dueDate}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Goal status"
                      value={detail.goal.status}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'active' || value === 'done' || value === 'paused') {
                          void updateGoalStatus(detail.goal, value);
                        }
                      }}
                      className="input !w-auto !px-2 !py-1 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="done">Done</option>
                      <option value="paused">Paused</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void requestDelete('goal', detail.goal.id)}
                      className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Delete goal"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {detail.goal.dueDate && <p className="text-xs text-zinc-600">Started {detail.goal.startDate ?? 'not set'}</p>}
              </div>

              <div className="card space-y-3 p-5">
                <h3 className="text-sm font-semibold text-zinc-200">Milestones ({detail.milestones.length})</h3>
                {detail.milestones.length === 0 && <p className="text-sm text-zinc-600">No milestones yet.</p>}
                {detail.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-950/60 p-3">
                    <div>
                      <p className="text-sm text-zinc-200">{milestone.title}</p>
                      <p className="mt-1 text-xs text-zinc-600">{milestone.dueDate ? `Due ${milestone.dueDate}` : 'No due date'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Status for ${milestone.title}`}
                        value={milestone.status}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === 'active' || value === 'done' || value === 'paused') {
                            void updateMilestoneStatus(milestone, value);
                          }
                        }}
                        className="input !w-auto !px-2 !py-1 text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="done">Done</option>
                        <option value="paused">Paused</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void requestDelete('milestone', milestone.id)}
                        aria-label={`Delete ${milestone.title}`}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                <form onSubmit={createMilestone} className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                  <input
                    required
                    maxLength={200}
                    value={milestoneTitle}
                    onChange={(event) => setMilestoneTitle(event.target.value)}
                    placeholder="New milestone title"
                    aria-label="New milestone title"
                    className={`${FIELD} min-w-48 flex-1`}
                  />
                  <button type="submit" disabled={saving} className="btn-secondary">
                    Add milestone
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">Tasks ({detail.tasks.length})</h3>
                {detail.tasks.length === 0 ? (
                  <p className="card p-4 text-sm text-zinc-600">No tasks assigned to this goal.</p>
                ) : detail.tasks.map((task) => (
                  <RoadmapTaskRow
                    key={task.id}
                    task={task}
                    onStatus={(row, status) => void changeTaskStatus(row, status)}
                    onDelete={(row) => void deleteTask(row)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {deleteRequest && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md space-y-4 p-5">
            <h2 id="delete-title" className="font-semibold text-zinc-100">Confirm cascading delete</h2>
            <p className="text-sm text-zinc-400">
              This will delete {deleteRequest.counts.goals ?? 0} goal(s), {deleteRequest.counts.milestones ?? 0} milestone(s), and {deleteRequest.counts.tasks} task(s), including {deleteRequest.counts.completedTasks} completed task(s).
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteRequest(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={() => void confirmDelete()} disabled={deleting} className="rounded-xl bg-red-500 px-4 py-2 font-medium text-white disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
