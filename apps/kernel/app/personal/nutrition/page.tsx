'use client';

import { useEffect, useState } from 'react';
import PersonalError from '@/components/personal/PersonalError';
import NumberInput from '@/components/personal/NumberInput';
import SectionCard from '@/components/personal/SectionCard';
import Toggle from '@/components/personal/Toggle';
import { NUTRITION_TIPS } from '@/lib/personal/content';
import { todayISO } from '@/lib/personal/scoring';

interface DailyLog {
  calories?: number | null;
  protein?: number | null;
  meals?: boolean | null;
}

export default function PersonalNutritionPage() {
  const today = todayISO();
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [meals, setMeals] = useState(false);
  const [hasLog, setHasLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/personal/daily-log?date=${encodeURIComponent(today)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
        if (active && data) {
          const log = data as DailyLog;
          setHasLog(true);
          setCalories(log.calories ?? 0);
          setProtein(log.protein ?? 0);
          setMeals(log.meals ?? false);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load nutrition data.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [today]);

  const score =
    (Math.min(calories, 2500) / 2500) * 15 +
    (Math.min(protein, 120) / 120) * 15 +
    (meals ? 5 : 0);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/personal/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, calories, protein, meals }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      setMessage('Nutrition saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save nutrition.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PersonalError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}
      {loading ? <p className="text-sm text-zinc-500">Loading nutrition…</p> : (
        <>
          {!hasLog && <p className="text-sm text-zinc-500">No nutrition log for today yet.</p>}
          <SectionCard title="Nutrition" score={score} maxScore={35}>
            <NumberInput label="Calories" points="up to 15 pts" value={calories} onChange={setCalories} unit="kcal" max={9999} step={50} />
            <Progress label="Calories" current={calories} target={2500} unit="kcal" />
            <NumberInput label="Protein" points="up to 15 pts" value={protein} onChange={setProtein} unit="g" max={500} />
            <Progress label="Protein" current={protein} target={120} unit="g" />
            <Toggle value={meals} onChange={setMeals} label="Ate 3+ meals today" points="+5 pts" />
          </SectionCard>
          <section className="card space-y-3 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">High-calorie tips</h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              {NUTRITION_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </section>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save nutrition'}
          </button>
        </>
      )}
    </div>
  );
}

function Progress({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  const percentage = Math.min(100, (current / target) * 100);
  return (
    <div className="space-y-1 px-1">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{label} target: {target} {unit}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
