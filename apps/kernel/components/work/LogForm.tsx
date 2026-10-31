'use client';

import { useEffect, useState } from 'react';
import { computeScore } from '@/lib/work/score';
import { readWorkResponse } from '@/lib/work/client';
import { todayPKT } from '@/lib/work/date';
import type { DailyLog, Project } from '@/lib/work/types';
import WorkError from '@/components/work/WorkError';

type LogResponse = { log: DailyLog | null };
type ProjectsResponse = { projects: Project[] };
type SaveResponse = { log: DailyLog };

export default function LogForm() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deepWorkHours, setDeepWorkHours] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [milestoneDone, setMilestoneDone] = useState(false);
  const [profDevMinutes, setProfDevMinutes] = useState(0);
  const [noProcrastination, setNoProcrastination] = useState(false);
  const [clientDeliverable, setClientDeliverable] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [logResponse, projectsResponse] = await Promise.all([
          fetch(`/api/work/log?date=${encodeURIComponent(todayPKT())}`, { cache: 'no-store' }),
          fetch('/api/work/projects', { cache: 'no-store' }),
        ]);
        const [logData, projectData] = await Promise.all([
          readWorkResponse<LogResponse>(logResponse),
          readWorkResponse<ProjectsResponse>(projectsResponse),
        ]);
        if (!active) return;
        const initial = logData.log;
        setLog(initial);
        setDeepWorkHours(initial?.deepWorkHours ?? 0);
        setTasksCompleted(initial?.tasksCompleted ?? 0);
        setMilestoneDone(initial?.milestoneDone ?? false);
        setProfDevMinutes(initial?.profDevMinutes ?? 0);
        setNoProcrastination(initial?.noProcrastination ?? false);
        setClientDeliverable(initial?.clientDeliverable ?? false);
        setProjectId(initial?.projectId ?? '');
        setNotes(initial?.notes ?? '');
        setProjects(projectData.projects);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load Work data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const breakdown = computeScore({
    deepWorkHours,
    tasksCompleted,
    milestoneDone,
    profDevMinutes,
    noProcrastination,
    clientDeliverable,
  });
  const activeProjects = projects.filter((project) => project.status === 'active');

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/work/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logDate: todayPKT(),
          deepWorkHours,
          tasksCompleted,
          milestoneDone,
          profDevMinutes,
          noProcrastination,
          clientDeliverable,
          projectId: projectId || null,
          notes: notes || null,
        }),
      });
      const data = await readWorkResponse<SaveResponse>(response);
      setLog(data.log);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save today’s log.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading today&apos;s log…</div>;
  }

  return (
    <div className="space-y-5">
      <WorkError message={error} />
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Today&apos;s score</span>
          <span className="text-lg font-semibold tabular-nums text-brand-300">{breakdown.total}/100</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${breakdown.total}%` }} />
        </div>
      </section>

      <NumberField
        label="Deep work hours"
        hint="4 hours reaches the full 25 points"
        value={deepWorkHours}
        onChange={setDeepWorkHours}
        step={0.25}
        min={0}
        max={16}
        points={`${breakdown.deepWork}/25`}
      />
      <NumberField
        label="Tasks completed"
        hint="5 tasks reaches the full 20 points"
        value={tasksCompleted}
        onChange={setTasksCompleted}
        step={1}
        min={0}
        max={50}
        points={`${breakdown.tasks}/20`}
      />
      <ToggleField
        label="Project milestone progress"
        hint="Made real progress on a project milestone today"
        checked={milestoneDone}
        onChange={setMilestoneDone}
        points="20 pts"
      />
      {activeProjects.length > 0 && milestoneDone && (
        <label className="block">
          <span className="label">Which project?</span>
          <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Unspecified</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      )}
      <NumberField
        label="Professional development"
        hint="Reading or learning; 30 minutes reaches the full 15 points"
        value={profDevMinutes}
        onChange={setProfDevMinutes}
        step={5}
        min={0}
        max={300}
        unit="min"
        points={`${breakdown.profDev}/15`}
      />
      <ToggleField
        label="No procrastination"
        hint="Stayed on task without drifting into distraction"
        checked={noProcrastination}
        onChange={setNoProcrastination}
        points="10 pts"
      />
      <ToggleField
        label="Client / deliverable submitted"
        hint="Bonus — not always applicable"
        checked={clientDeliverable}
        onChange={setClientDeliverable}
        points="+10 pts"
      />
      <label className="block">
        <span className="label">Private notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Anything worth remembering about today…"
          className="input resize-y"
        />
      </label>
      <button className="btn-primary sticky bottom-20 w-full py-3" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved' : log ? 'Save changes' : 'Save daily log'}
      </button>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  step,
  min,
  max,
  unit,
  points,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  points: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        <span className="text-xs font-medium tabular-nums text-brand-300">{points}</span>
      </div>
      <div className="card flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-400 hover:bg-zinc-800"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="w-full flex-1 bg-transparent text-center text-lg font-medium tabular-nums text-zinc-100 outline-none"
        />
        {unit && <span className="text-xs text-zinc-500">{unit}</span>}
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-400 hover:bg-zinc-800"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
      <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
  points,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  points: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`card flex w-full items-center justify-between gap-4 p-4 text-left ${
        checked ? 'border-brand-700 bg-brand-950/40' : 'hover:border-zinc-700'
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
        <span className="mt-1 block text-xs text-brand-300">{points}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full ${checked ? 'bg-brand-500' : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
