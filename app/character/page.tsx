'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isoWeekPKT } from '@/lib/time';
import type { CharacterRating } from '@/db/schema';

const VIRTUES = [
  { key: 'patience', label: 'Patience', color: '#34d883' },
  { key: 'discipline', label: 'Discipline', color: '#60a5fa' },
  { key: 'gratitude', label: 'Gratitude', color: '#facc15' },
  { key: 'humility', label: 'Humility', color: '#c084fc' },
  { key: 'truthfulness', label: 'Truthfulness', color: '#f87171' },
] as const;

export default function CharacterPage() {
  const [weeks, setWeeks] = useState<CharacterRating[]>([]);
  const [form, setForm] = useState({ patience: 3, discipline: 3, gratitude: 3, humility: 3, truthfulness: 3 });
  const [saving, setSaving] = useState(false);
  const currentWeek = isoWeekPKT();

  async function load() {
    const res = await fetch('/api/character');
    const data = await res.json();
    const rows: CharacterRating[] = data.weeks ?? [];
    setWeeks(rows);
    const existing = rows.find((w) => w.isoWeek === currentWeek);
    if (existing) {
      setForm({
        patience: existing.patience,
        discipline: existing.discipline,
        gratitude: existing.gratitude,
        humility: existing.humility,
        truthfulness: existing.truthfulness,
      });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/character',
        { cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isoWeek: currentWeek }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const chartData = weeks
    .slice()
    .reverse()
    .slice(-8)
    .map((w) => ({
      week: w.isoWeek,
      patience: w.patience,
      discipline: w.discipline,
      gratitude: w.gratitude,
      humility: w.humility,
      truthfulness: w.truthfulness,
    }));

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Character</h1>
        <p className="text-sm text-zinc-500 mt-1">Weekly self-rating, week {currentWeek}</p>
      </header>

      <div className="card p-6 space-y-5">
        {VIRTUES.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">{label}</span>
              <span className="text-sm tabular-nums text-zinc-500">
                {form[key as keyof typeof form]} / 5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form[key as keyof typeof form]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
              }
              className="w-full accent-brand-500"
              style={{ accentColor: color }}
            />
          </div>
        ))}
        <button onClick={save} disabled={saving} className="btn-primary w-full mt-2">
          {saving ? 'Saving…' : 'Save This Week'}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Trend — Last 8 Weeks
        </h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-600">No history yet. Save your first week above.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="week" stroke="#71717a" fontSize={11} />
              <YAxis domain={[1, 5]} stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {VIRTUES.map(({ key, label, color }) => (
                <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
