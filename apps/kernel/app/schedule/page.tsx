'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import TaskCard from '@/components/TaskCard';
import type { ScheduledTask } from '@/lib/types';

interface TodayResponse {
  date: string;
  exists: boolean;
  generationError?: string | null;
  generatedAt?: string;
  visible: ScheduledTask[];
  missed: ScheduledTask[];
  upcoming: ScheduledTask[];
  done: ScheduledTask[];
}

function groupByWindow(tasks: ScheduledTask[]) {
  const windows: { label: string; tasks: ScheduledTask[] }[] = [
    { label: 'Before Fajr', tasks: [] },
    { label: 'Fajr → Dhuhr', tasks: [] },
    { label: 'Dhuhr → Asr', tasks: [] },
    { label: 'Asr → Maghrib', tasks: [] },
    { label: 'Maghrib → Isha', tasks: [] },
    { label: 'After Isha', tasks: [] },
  ];
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  for (const task of tasks) {
    const label = task.timeLabel.includes('Fajr')
      ? task.time && toMin(task.time) < 300
        ? 'Before Fajr'
        : 'Fajr → Dhuhr'
      : task.timeLabel.includes('Dhuhr')
      ? 'Fajr → Dhuhr'
      : task.timeLabel.includes('Asr')
      ? 'Dhuhr → Asr'
      : task.timeLabel.includes('Maghrib')
      ? 'Asr → Maghrib'
      : task.timeLabel.includes('Isha')
      ? 'Maghrib → Isha'
      : 'After Isha';
    const bucket = windows.find((w) => w.label === label) ?? windows[windows.length - 1];
    bucket.tasks.push(task);
  }
  return windows.filter((w) => w.tasks.length > 0);
}

export default function SchedulePage() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/scheduler/today', { cache: 'no-store' });
    const json = (await res.json()) as TodayResponse;
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // refresh every minute for time-based visibility
    return () => clearInterval(interval);
  }, [load]);

  async function markDone(id: string) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            visible: prev.visible.map((t) => (t.id === id ? { ...t, status: 'done' } : t)),
          }
        : prev
    );
    await fetch(`/api/scheduler/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    load();
  }

  async function regenerate() {
    setRegenerating(true);
    await fetch('/api/scheduler/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    });
    await load();
    setRegenerating(false);
  }

  async function submitNotes() {
    if (!notes.trim()) return;
    setSavingNotes(true);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: notes.trim(), feedsSchedule: true }),
    });
    setNotes('');
    setSavingNotes(false);
  }

  const allActive = data ? [...data.visible, ...data.upcoming] : [];
  const windows = groupByWindow(allActive);
  const now = new Date();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Today's Schedule</h1>
          <p className="text-xs text-zinc-600 mt-1">
            {now.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
        >
          {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Regenerate
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-600">Loading...</p>}

      {!loading && data && !data.exists && (
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-400 mb-3">No schedule generated for today yet.</p>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            {regenerating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      )}

      {!loading && data?.generationError && (
        <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-2 text-xs text-amber-500">
          Last generation had an issue: {data.generationError}
        </div>
      )}

      {!loading && data && data.missed.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-red-500 mb-2">Missed today</p>
          <div className="space-y-2">
            {data.missed.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={markDone} />
            ))}
          </div>
        </div>
      )}

      {!loading &&
        windows.map((w) => (
          <div key={w.label} className="mb-6">
            <p className="text-xs font-medium text-zinc-600 mb-2">{w.label}</p>
            <div className="space-y-2">
              {w.tasks.map((t) => (
                <TaskCard key={t.id} task={t} onMarkDone={markDone} />
              ))}
            </div>
          </div>
        ))}

      {!loading && data && data.done.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-zinc-700 mb-2">Done</p>
          <div className="space-y-2">
            {data.done.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={markDone} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-900 bg-zinc-900/40 p-4">
        <p className="text-xs font-medium text-zinc-400 mb-2">Notes for tomorrow's schedule</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. add gym at 4pm, move deep work earlier..."
          rows={2}
          className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={submitNotes}
          disabled={savingNotes || !notes.trim()}
          className="mt-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          {savingNotes ? 'Saving...' : 'Save note'}
        </button>
      </div>
    </div>
  );
}
