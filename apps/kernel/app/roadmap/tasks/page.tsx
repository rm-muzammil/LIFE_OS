'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import RoadmapError from '@/components/roadmap/RoadmapError';
import RoadmapTaskRow from '@/components/roadmap/RoadmapTaskRow';
import { jsonBody, roadmapRequest } from '@/lib/roadmap/client';
import { ROADMAP_DOMAINS, type RoadmapDomain, type RoadmapPriority, type RoadmapTaskStatus } from '@/lib/roadmap/types';
import type { RoadmapGoal, RoadmapMilestone, RoadmapTask } from '@/db/schema';

const FIELD = 'input';

export default function RoadmapTasksPage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [goals, setGoals] = useState<RoadmapGoal[]>([]);
  const [milestones, setMilestones] = useState<RoadmapMilestone[]>([]);
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [goalId, setGoalId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<RoadmapDomain>('other');
  const [priority, setPriority] = useState<RoadmapPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimate, setEstimate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (domainFilter) params.set('domain', domainFilter);
      if (statusFilter) params.set('status', statusFilter);
      const query = params.toString();
      const [taskResult, goalResult] = await Promise.all([
        roadmapRequest<{ tasks: RoadmapTask[] }>(`/api/roadmap/tasks${query ? `?${query}` : ''}`, { cache: 'no-store' }),
        roadmapRequest<{ goals: RoadmapGoal[] }>('/api/roadmap/goals', { cache: 'no-store' }),
      ]);
      setTasks(taskResult.tasks);
      setGoals(goalResult.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [domainFilter, statusFilter]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!goalId) {
      setMilestones([]);
      setMilestoneId('');
      return () => { active = false; };
    }
    roadmapRequest<{ milestones: RoadmapMilestone[] }>(
      `/api/roadmap/milestones?goalId=${encodeURIComponent(goalId)}`,
      { cache: 'no-store' }
    ).then((result) => {
      if (active) setMilestones(result.milestones);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Unable to load milestones.');
    });
    return () => { active = false; };
  }, [goalId]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await roadmapRequest('/api/roadmap/tasks', {
        method: 'POST',
        ...jsonBody({
          title,
          domain,
          priority,
          dueDate: dueDate || null,
          estimateMinutes: estimate ? Number(estimate) : null,
          goalId: goalId || null,
          milestoneId: milestoneId || null,
        }),
      });
      setTitle('');
      setDueDate('');
      setEstimate('');
      setMessage('Task added.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create task.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: RoadmapTask, status: 'todo' | 'done' | 'skipped') {
    setError(null);
    try {
      await roadmapRequest(`/api/roadmap/tasks/${task.id}`, { method: 'PATCH', ...jsonBody({ status }) });
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

  return (
    <div className="space-y-5">
      <RoadmapError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}

      <form onSubmit={createTask} className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-zinc-200">Add a task</h2>
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
          <span className="label">Goal (optional)</span>
          <select value={goalId} onChange={(event) => { setGoalId(event.target.value); setMilestoneId(''); }} className={FIELD}>
            <option value="">Unassigned</option>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Milestone (optional)</span>
          <select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)} disabled={!goalId} className={FIELD}>
            <option value="">No milestone</option>
            {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Due date</span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={FIELD} />
        </label>
        <label>
          <span className="label">Estimate (minutes)</span>
          <input type="number" min={1} step={1} value={estimate} onChange={(event) => setEstimate(event.target.value)} className={FIELD} />
        </label>
        <button type="submit" disabled={saving} className="btn-primary sm:col-span-2">
          {saving ? 'Adding…' : 'Add task'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-40 flex-1">
          <span className="label">Filter by domain</span>
          <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className={FIELD}>
            <option value="">All domains</option>
            {ROADMAP_DOMAINS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="min-w-40 flex-1">
          <span className="label">Filter by status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={FIELD}>
            <option value="">All statuses</option>
            {(['todo', 'done', 'skipped', 'suggested'] as RoadmapTaskStatus[]).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading tasks…</p> : tasks.length === 0 ? (
        <p className="card p-5 text-sm text-zinc-500">No tasks match these filters.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <RoadmapTaskRow key={task.id} task={task} onStatus={changeStatus} onDelete={removeTask} />
          ))}
        </div>
      )}
    </div>
  );
}
