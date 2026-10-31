'use client';

import { useEffect, useMemo, useState } from 'react';
import PersonalError from '@/components/personal/PersonalError';
import SectionCard from '@/components/personal/SectionCard';
import Slider from '@/components/personal/Slider';
import Toggle from '@/components/personal/Toggle';
import { todayISO, isRestDay } from '@/lib/personal/scoring';
import type { Exercise } from '@/lib/personal/types';

interface ExerciseLog {
  exerciseName: string;
  setsPlanned: number | null;
  setsCompleted: number | null;
  reps: string | null;
  notes: string | null;
}

interface DailyLog {
  workoutDone?: boolean | null;
  allSetsDone?: boolean | null;
  effortRating?: number | null;
}

interface PlanPayload {
  plan: { plan: { exercises?: Exercise[]; focus?: string } };
  logs: ExerciseLog[];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status})`);
  return data as T;
}

export default function PersonalTrainingPage() {
  const today = todayISO();
  const restDay = isRestDay(today);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [plan, setPlan] = useState<PlanPayload['plan'] | null>(null);
  const [setLogs, setSetLogs] = useState<Record<string, ExerciseLog>>({});
  const [workoutDone, setWorkoutDone] = useState(false);
  const [allSetsDone, setAllSetsDone] = useState(false);
  const [effort, setEffort] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [daily, workout] = await Promise.all([
          api<DailyLog | null>(`/api/personal/daily-log?date=${encodeURIComponent(today)}`),
          api<PlanPayload | null>(`/api/personal/workout-plans?date=${encodeURIComponent(today)}`),
        ]);
        if (!active) return;
        setDailyLog(daily);
        setWorkoutDone(daily?.workoutDone ?? false);
        setAllSetsDone(daily?.allSetsDone ?? false);
        setEffort(daily?.effortRating ?? 3);
        setPlan(workout?.plan ?? null);
        setSetLogs(Object.fromEntries((workout?.logs ?? []).map((log) => [log.exerciseName, log])));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load training data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [today]);

  const exercises = plan?.plan?.exercises ?? [];
  const score = useMemo(() => {
    if (restDay) return 20;
    return Math.round((workoutDone ? 20 : 0) + (allSetsDone ? 10 : 0) + (effort / 5) * 10);
  }, [restDay, workoutDone, allSetsDone, effort]);

  async function logSet(exerciseName: string, setsCompleted: number, setsPlanned: number) {
    const previous = setLogs[exerciseName];
    const updated: ExerciseLog = {
      exerciseName,
      setsPlanned,
      setsCompleted,
      reps: previous?.reps ?? '',
      notes: previous?.notes ?? '',
    };
    setSetLogs((current) => ({ ...current, [exerciseName]: updated }));
    setError(null);
    try {
      await api('/api/personal/workout-plans/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, ...updated }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save exercise progress.');
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ score: number }>('/api/personal/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, workoutDone, allSetsDone, effortRating: effort, isRestDay: restDay }),
      });
      setDailyLog((current) => ({ ...current, workoutDone, allSetsDone, effortRating: effort }));
      setMessage(`Saved · Training score: ${result.score}/100`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save training.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PersonalError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}
      <SectionCard title="Training" score={score} maxScore={40}>
        {loading ? <p className="text-sm text-zinc-500">Loading training…</p> : restDay ? (
          <p className="text-sm text-zinc-400">Rest day — 20 points are awarded automatically.</p>
        ) : (
          <>
            <Toggle value={workoutDone} onChange={setWorkoutDone} label="Workout completed" points="+20 pts" />
            <Toggle value={allSetsDone} onChange={setAllSetsDone} label="All sets completed" points="+10 pts" />
            <Slider value={effort} onChange={setEffort} min={1} max={5} label="Effort rating" points="up to +10 pts" display={`${effort}/5`} />
          </>
        )}
      </SectionCard>

      {loading ? null : plan ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Today&apos;s plan</h2>
            <p className="mt-1 text-xs text-zinc-500">{plan.plan.focus}</p>
          </div>
          {exercises.map((exercise) => {
            const log = setLogs[exercise.name];
            const completed = log?.setsCompleted ?? 0;
            return (
              <div key={exercise.name} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{exercise.sets} sets × {exercise.reps}</p>
                  </div>
                  {completed >= exercise.sets && <span className="text-xs text-brand-300">Done</span>}
                </div>
                {exercise.notes && <p className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-400">{exercise.notes}</p>}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: exercise.sets }).map((_, index) => {
                    const done = completed > index;
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={`${exercise.name}: set ${index + 1}`}
                        onClick={() => void logSet(exercise.name, done ? index : index + 1, exercise.sets)}
                        className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                          done ? 'bg-brand-500 text-zinc-950' : 'border border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        !loading && <p className="card p-5 text-sm text-zinc-500">No workout plan generated yet. Generate one from Settings.</p>
      )}

      <button type="button" onClick={() => void save()} disabled={saving || loading} className="btn-primary w-full">
        {saving ? 'Saving…' : 'Save training'}
      </button>
      {dailyLog && <p className="text-center text-xs text-zinc-600">Today&apos;s log is saved to your account.</p>}
    </div>
  );
}
