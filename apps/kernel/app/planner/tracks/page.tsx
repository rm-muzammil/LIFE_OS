'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PlannerTrackRow } from '@/lib/planner/types';
import { jsonBody, plannerRequest } from '@/lib/planner/client';

interface WeekCapacity {
  totalFreeMinutes: number;
}

interface TracksResponse {
  tracks: PlannerTrackRow[];
}

interface TrackForm {
  title: string;
  domain: PlannerTrackRow['domain'];
  weeklyTargetMinutes: string;
  minSessionMinutes: string;
  maxSessionMinutes: string;
  maxPerDayMinutes: string;
  preferredWindow: PlannerTrackRow['preferredWindow'];
  allowedWeekdays: string;
  priority: PlannerTrackRow['priority'];
  active: boolean;
  goalId: string;
}

const EMPTY_FORM: TrackForm = {
  title: '',
  domain: 'learning',
  weeklyTargetMinutes: '180',
  minSessionMinutes: '25',
  maxSessionMinutes: '60',
  maxPerDayMinutes: '120',
  preferredWindow: 'any',
  allowedWeekdays: '127',
  priority: 'medium',
  active: true,
  goalId: '',
};

const QUICK_ADDS = [
  { title: 'Docker', minutes: 180 },
  { title: 'DSA', minutes: 300 },
  { title: 'LinkedIn', minutes: 120 },
  { title: 'Arabic', minutes: 210 },
  { title: 'German', minutes: 210 },
] as const;

function trackToForm(track: PlannerTrackRow): TrackForm {
  return {
    title: track.title,
    domain: track.domain,
    weeklyTargetMinutes: String(track.weeklyTargetMinutes),
    minSessionMinutes: String(track.minSessionMinutes),
    maxSessionMinutes: String(track.maxSessionMinutes),
    maxPerDayMinutes: String(track.maxPerDayMinutes),
    preferredWindow: track.preferredWindow,
    allowedWeekdays: String(track.allowedWeekdays),
    priority: track.priority,
    active: track.active,
    goalId: track.goalId ?? '',
  };
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export default function PlannerTracksPage() {
  const [tracks, setTracks] = useState<PlannerTrackRow[]>([]);
  const [freeMinutes, setFreeMinutes] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<PlannerTrackRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [trackData, capacity] = await Promise.all([
        plannerRequest<TracksResponse>('/api/planner/tracks', { cache: 'no-store' }),
        plannerRequest<WeekCapacity>('/api/planner/week', { cache: 'no-store' }),
      ]);
      setTracks(trackData.tracks);
      setFreeMinutes(capacity.totalFreeMinutes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load learning tracks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeTarget = useMemo(
    () => tracks.filter((track) => track.active).reduce((sum, track) => sum + track.weeklyTargetMinutes, 0),
    [tracks]
  );
  const overCapacity = freeMinutes !== null && activeTarget > freeMinutes;

  function quickAdd(title: string, minutes: number) {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      title,
      weeklyTargetMinutes: String(minutes),
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      title: form.title,
      domain: form.domain,
      weeklyTargetMinutes: Number(form.weeklyTargetMinutes),
      minSessionMinutes: Number(form.minSessionMinutes),
      maxSessionMinutes: Number(form.maxSessionMinutes),
      maxPerDayMinutes: Number(form.maxPerDayMinutes),
      preferredWindow: form.preferredWindow,
      allowedWeekdays: Number(form.allowedWeekdays),
      priority: form.priority,
      active: form.active,
      goalId: form.goalId.trim() || null,
    };
    try {
      await plannerRequest(
        editing ? `/api/planner/tracks/${editing.id}` : '/api/planner/tracks',
        { method: editing ? 'PATCH' : 'POST', ...jsonBody(body) }
      );
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the learning track.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(track: PlannerTrackRow) {
    if (!window.confirm(`Delete the ${track.title} learning track?`)) return;
    try {
      await plannerRequest(`/api/planner/tracks/${track.id}`, { method: 'DELETE' });
      if (editing?.id === track.id) resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete the learning track.');
    }
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}

      <section className={`rounded-xl border p-4 ${overCapacity ? 'border-amber-800/70 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Weekly learning capacity</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {minutesLabel(activeTarget)} <span className="text-sm font-normal text-zinc-500">targets</span>
              <span className="mx-2 text-zinc-700">/</span>
              {freeMinutes === null ? '—' : minutesLabel(freeMinutes)}
              <span className="ml-1 text-sm font-normal text-zinc-500">free</span>
            </p>
          </div>
          {overCapacity && <p role="status" className="text-sm font-medium text-amber-300">Over capacity — active weekly targets exceed free time.</p>}
        </div>
        <p className="mt-2 text-xs text-zinc-600">Free minutes are calculated across this week after fixed commitments, prayers, and sleep.</p>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{editing ? 'Edit learning track' : 'Add learning track'}</h2>
          <p className="mt-1 text-xs text-zinc-500">Quick-add suggestions only fill this form; nothing is saved until you submit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADDS.map((suggestion) => (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => quickAdd(suggestion.title, suggestion.minutes)}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-brand-500/60 hover:text-brand-300"
            >
              {suggestion.title} · {minutesLabel(suggestion.minutes)}/week
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="label">Title</span>
            <input className="input" required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span className="label">Domain</span>
            <select className="input" value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value as TrackForm['domain'] })}>
              {['faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other'].map((domain) => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Weekly target (minutes)</span>
            <input className="input" type="number" min={0} max={10080} required value={form.weeklyTargetMinutes} onChange={(event) => setForm({ ...form, weeklyTargetMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Minimum session (minutes)</span>
            <input className="input" type="number" min={1} max={1440} required value={form.minSessionMinutes} onChange={(event) => setForm({ ...form, minSessionMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Maximum session (minutes)</span>
            <input className="input" type="number" min={1} max={1440} required value={form.maxSessionMinutes} onChange={(event) => setForm({ ...form, maxSessionMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Maximum per day (minutes)</span>
            <input className="input" type="number" min={1} max={1440} required value={form.maxPerDayMinutes} onChange={(event) => setForm({ ...form, maxPerDayMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Preferred window</span>
            <select className="input" value={form.preferredWindow} onChange={(event) => setForm({ ...form, preferredWindow: event.target.value as TrackForm['preferredWindow'] })}>
              {['morning', 'afternoon', 'evening', 'night', 'any'].map((window) => <option key={window} value={window}>{window}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Allowed weekdays bitmask (0–127)</span>
            <input className="input" type="number" min={0} max={127} required value={form.allowedWeekdays} onChange={(event) => setForm({ ...form, allowedWeekdays: event.target.value })} />
          </label>
          <label>
            <span className="label">Priority</span>
            <select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TrackForm['priority'] })}>
              {['low', 'medium', 'high'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Roadmap goal ID (optional)</span>
            <input className="input" value={form.goalId} onChange={(event) => setForm({ ...form, goalId: event.target.value })} placeholder="UUID" />
          </label>
          <label className="flex items-center gap-2 self-center text-sm text-zinc-400">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Active
          </label>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {editing ? <Pencil size={15} /> : <Plus size={16} />}
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add track'}
            </button>
            {editing && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel edit</button>}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Your learning tracks</h2>
        {loading ? <p role="status" className="text-sm text-zinc-500">Loading tracks…</p> :
          tracks.length === 0 ? <p className="card p-4 text-sm text-zinc-500">No tracks yet. Choose a quick-add suggestion or enter one above.</p> :
          tracks.map((track) => (
            <article key={track.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{track.title}</p>
                <p className="mt-1 text-xs capitalize text-zinc-500">
                  {track.domain} · {minutesLabel(track.weeklyTargetMinutes)}/week · {track.priority}
                  {!track.active && ' · paused'}
                </p>
              </div>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label={`Edit ${track.title}`} onClick={() => { setEditing(track); setForm(trackToForm(track)); }}>
                <Pencil size={15} />
              </button>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-red-950/60 hover:text-red-300" aria-label={`Delete ${track.title}`} onClick={() => void remove(track)}>
                <Trash2 size={15} />
              </button>
            </article>
          ))}
      </section>
    </div>
  );
}
