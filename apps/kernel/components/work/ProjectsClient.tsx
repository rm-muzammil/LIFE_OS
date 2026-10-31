'use client';

import { useCallback, useEffect, useState } from 'react';
import { readWorkResponse } from '@/lib/work/client';
import type { Project, ProjectStatus } from '@/lib/work/types';
import WorkError from '@/components/work/WorkError';

type ProjectsResponse = { projects: Project[] };

const STATUSES: ProjectStatus[] = ['active', 'paused', 'completed'];
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-brand-500/10 text-brand-300',
  paused: 'bg-amber-500/10 text-amber-300',
  completed: 'bg-zinc-700/40 text-zinc-400',
};

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const loadProjects = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/work/projects', { cache: 'no-store' });
      const data = await readWorkResponse<ProjectsResponse>(response);
      setProjects(data.projects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function createProject() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/work/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, targetDate: targetDate || null }),
      });
      await readWorkResponse<{ project: Project }>(response);
      setName('');
      setDescription('');
      setTargetDate('');
      setShowForm(false);
      await loadProjects();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create project.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: ProjectStatus) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/work/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await readWorkResponse<{ project: Project }>(response);
      await loadProjects();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update project.');
    } finally {
      setSaving(false);
    }
  }

  async function removeProject(id: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/work/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await readWorkResponse<{ ok: boolean }>(response);
      await loadProjects();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <WorkError message={error} />
      <button
        type="button"
        onClick={() => setShowForm((open) => !open)}
        className="btn-secondary w-full border border-dashed border-zinc-700"
      >
        {showForm ? 'Cancel' : '+ New project'}
      </button>

      {showForm && (
        <div className="card space-y-3 p-4">
          <label>
            <span className="label">Project name</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className="label">Description (optional)</span>
            <textarea className="input resize-y" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <span className="label">Target date (optional)</span>
            <input className="input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </label>
          <button className="btn-primary w-full" onClick={() => void createProject()} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Create project'}
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card border-dashed p-8 text-center text-sm text-zinc-500">
          No projects yet. Add one to track milestone progress from the daily log.
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-100">{project.name}</h3>
                  {project.description && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-500">{project.description}</p>}
                  {project.targetDate && <p className="mt-2 text-[11px] text-zinc-600">Target: {project.targetDate}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[project.status]}`}>
                  {project.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUSES.filter((status) => status !== project.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void setStatus(project.id, status)}
                    disabled={saving}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                  >
                    Mark {status}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void removeProject(project.id)}
                  disabled={saving}
                  className="btn-danger ml-auto px-3 py-1 text-xs"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
