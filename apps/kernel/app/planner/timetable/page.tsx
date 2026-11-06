'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PlannerCommitmentRow, PlannerBlock, PlannerOverlapWarning } from '@/lib/planner/types';
import { formatMinutesAsTime } from '@/lib/planner/time';
import { jsonBody, plannerRequest } from '@/lib/planner/client';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Occurrence {
  commitment: PlannerCommitmentRow;
  cancelled: boolean;
}

interface DayData {
  date: string;
  blocks: PlannerBlock[];
  warnings: PlannerOverlapWarning[];
  occurrences: Occurrence[];
}

interface WeekData {
  start: string;
  days: DayData[];
}

interface CommitmentForm {
  title: string;
  kind: PlannerCommitmentRow['kind'];
  scheduleType: 'weekly' | 'date';
  weekdays: string[];
  date: string;
  startTime: string;
  endTime: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  validFrom: string;
  validTo: string;
  location: string;
  notes: string;
}

const EMPTY_FORM: CommitmentForm = {
  title: '',
  kind: 'lecture',
  scheduleType: 'weekly',
  weekdays: WEEKDAYS.map((_, index) => String(index)),
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  bufferBeforeMinutes: '0',
  bufferAfterMinutes: '0',
  validFrom: '',
  validTo: '',
  location: '',
  notes: '',
};

function toForm(commitment: PlannerCommitmentRow): CommitmentForm {
  return {
    title: commitment.title,
    kind: commitment.kind,
    scheduleType: commitment.date ? 'date' : 'weekly',
    weekdays: commitment.weekday === null
      ? WEEKDAYS.map((_, index) => String(index))
      : [String(commitment.weekday)],
    date: commitment.date ?? '',
    startTime: commitment.startTime,
    endTime: commitment.endTime,
    bufferBeforeMinutes: String(commitment.bufferBeforeMinutes),
    bufferAfterMinutes: String(commitment.bufferAfterMinutes),
    validFrom: commitment.validFrom ?? '',
    validTo: commitment.validTo ?? '',
    location: commitment.location ?? '',
    notes: commitment.notes ?? '',
  };
}

function formatRange(block: PlannerBlock) {
  return `${formatMinutesAsTime(block.startMinute)}–${formatMinutesAsTime(block.endMinute)}`;
}

export default function PlannerTimetablePage() {
  const [week, setWeek] = useState<WeekData | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<PlannerCommitmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await plannerRequest<WeekData>('/api/planner/week', { cache: 'no-store' });
      setWeek(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the weekly timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function applyPreset(title: string, startTime: string, endTime: string) {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      title,
      kind: 'other',
      startTime,
      endTime,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (form.scheduleType === 'weekly' && form.weekdays.length === 0) {
      setError('Select at least one weekday.');
      return;
    }
    setSaving(true);
    const commonBody = {
      title: form.title,
      kind: form.kind,
      startTime: form.startTime,
      endTime: form.endTime,
      bufferBeforeMinutes: Number(form.bufferBeforeMinutes),
      bufferAfterMinutes: Number(form.bufferAfterMinutes),
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      location: form.location || null,
      notes: form.notes || null,
      active: true,
    };
    try {
      if (form.scheduleType === 'date') {
        await plannerRequest(
          editing ? `/api/planner/commitments/${editing.id}` : '/api/planner/commitments',
          {
            method: editing ? 'PATCH' : 'POST',
            ...jsonBody({ ...commonBody, weekday: null, date: form.date }),
          }
        );
      } else {
        const weekdays = form.weekdays.map(Number);
        const firstWeekday = editing && editing.weekday !== null && weekdays.includes(editing.weekday)
          ? editing.weekday
          : weekdays[0];
        if (editing) {
          await plannerRequest(`/api/planner/commitments/${editing.id}`, {
            method: 'PATCH',
            ...jsonBody({ ...commonBody, weekday: firstWeekday, date: null }),
          });
        }
        await Promise.all(weekdays
          .filter((weekday) => !editing || weekday !== firstWeekday)
          .map((weekday) => plannerRequest('/api/planner/commitments', {
            method: 'POST',
            ...jsonBody({ ...commonBody, weekday, date: null }),
          })));
      }
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this commitment.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(commitment: PlannerCommitmentRow) {
    if (!window.confirm(`Delete “${commitment.title}” and its cancellation exceptions?`)) return;
    try {
      await plannerRequest(`/api/planner/commitments/${commitment.id}`, { method: 'DELETE' });
      if (editing?.id === commitment.id) resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete the commitment.');
    }
  }

  async function setCancelled(commitment: PlannerCommitmentRow, date: string, cancelled: boolean) {
    try {
      await plannerRequest(`/api/planner/commitments/${commitment.id}/exceptions`, {
        method: cancelled ? 'DELETE' : 'POST',
        ...jsonBody({ date }),
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this occurrence.');
    }
  }

  const warnings = week?.days.flatMap((day) => day.warnings.map((warning) => ({
    ...warning,
    date: day.date,
  }))) ?? [];

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{editing ? 'Edit commitment' : 'Add commitment'}</h2>
          <p className="mt-1 text-xs text-zinc-500">Recurring weekly lectures and commitments, or a single dated block.</p>
        </div>
        {!editing && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Protected-time presets (editable before saving)</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['Lunch', '13:30', '14:15'],
                ['Dinner', '20:00', '20:45'],
                ['Family/rest', '21:15', '22:00'],
                ['Exercise', '17:30', '18:15'],
              ].map(([title, start, end]) => (
                <button
                  key={title}
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => applyPreset(title, start, end)}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="label">Title</span>
            <input className="input" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span className="label">Type</span>
            <select className="input" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as CommitmentForm['kind'] })}>
              <option value="lecture">Lecture</option>
              <option value="work">Work</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span className="label">Repeats</span>
            <select className="input" value={form.scheduleType} onChange={(event) => setForm({ ...form, scheduleType: event.target.value as CommitmentForm['scheduleType'] })}>
              <option value="weekly">Weekly</option>
              <option value="date">One date</option>
            </select>
          </label>
          {form.scheduleType === 'weekly' ? (
            <fieldset className="sm:col-span-2">
              <legend className="label">Repeat on</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {WEEKDAYS.map((day, index) => {
                  const weekday = String(index);
                  return (
                    <label key={day} className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={form.weekdays.includes(weekday)}
                        onChange={(event) => setForm({
                          ...form,
                          weekdays: event.target.checked
                            ? [...form.weekdays, weekday]
                            : form.weekdays.filter((value) => value !== weekday),
                        })}
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <label>
              <span className="label">Date</span>
              <input className="input" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
          )}
          <label>
            <span className="label">Start time</span>
            <input className="input" type="time" required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          </label>
          <label>
            <span className="label">End time</span>
            <input className="input" type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            <span className="mt-1 block text-[11px] text-amber-400/80">Commitments cannot cross midnight; split this into two entries at midnight.</span>
          </label>
          <label>
            <span className="label">Travel before (minutes)</span>
            <input className="input" type="number" min={0} max={180} value={form.bufferBeforeMinutes} onChange={(event) => setForm({ ...form, bufferBeforeMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Travel after (minutes)</span>
            <input className="input" type="number" min={0} max={180} value={form.bufferAfterMinutes} onChange={(event) => setForm({ ...form, bufferAfterMinutes: event.target.value })} />
          </label>
          <label>
            <span className="label">Valid from (optional)</span>
            <input className="input" type="date" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} />
          </label>
          <label>
            <span className="label">Valid to (optional)</span>
            <input className="input" type="date" value={form.validTo} onChange={(event) => setForm({ ...form, validTo: event.target.value })} />
          </label>
          <label>
            <span className="label">Location (optional)</span>
            <input className="input" maxLength={200} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </label>
          <label>
            <span className="label">Notes (optional)</span>
            <input className="input" maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {editing ? <Pencil size={15} /> : <Plus size={16} />}
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add commitment'}
            </button>
            {editing && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel edit</button>}
          </div>
        </form>
      </section>

      {warnings.length > 0 && (
        <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium text-amber-300"><AlertTriangle size={16} /> Overlap warnings</h2>
          <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
            {warnings.map((warning, index) => <li key={`${warning.date}-${index}`}>{warning.date}: {warning.message}</li>)}
          </ul>
        </section>
      )}

      {loading && <p role="status" className="text-sm text-zinc-500">Loading weekly timetable…</p>}
      {week?.days.map((day, index) => (
        <section key={day.date} className="card space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">{WEEKDAYS[index]}</h2>
            <span className="text-xs text-zinc-600">{day.date}</span>
          </div>
          {day.occurrences.length === 0 ? (
            <p className="text-xs text-zinc-600">No commitments.</p>
          ) : (
            <div className="space-y-2">
              {day.occurrences.map(({ commitment, cancelled }) => {
                const block = day.blocks.find((entry) => entry.commitmentId === commitment.id);
                const start = block?.startMinute;
                const end = block?.endMinute;
                return (
                  <article key={commitment.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${cancelled ? 'border-zinc-800/70 opacity-50' : 'border-zinc-800 bg-zinc-950/40'}`}>
                    <span className="w-24 shrink-0 font-mono text-xs text-zinc-500">
                      {start === undefined || end === undefined
                        ? `${commitment.startTime}–${commitment.endTime}`
                        : formatRange({ id: commitment.id, title: commitment.title, kind: 'commitment', startMinute: start, endMinute: end })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${cancelled ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{commitment.title}</p>
                      <p className="mt-0.5 text-[11px] capitalize text-zinc-600">{commitment.kind}{commitment.location ? ` · ${commitment.location}` : ''}{commitment.validFrom || commitment.validTo ? ` · ${commitment.validFrom ?? '…'} to ${commitment.validTo ?? '…'}` : ''}</p>
                    </div>
                    <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label={`Edit ${commitment.title}`} onClick={() => { setEditing(commitment); setForm(toForm(commitment)); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="rounded-lg p-2 text-zinc-500 hover:bg-red-950/60 hover:text-red-300" aria-label={`Delete ${commitment.title}`} onClick={() => void remove(commitment)}>
                      <Trash2 size={15} />
                    </button>
                    <button
                      className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"
                      onClick={() => void setCancelled(commitment, day.date, !cancelled)}
                    >
                      {cancelled ? 'Restore date' : 'Cancel date'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
