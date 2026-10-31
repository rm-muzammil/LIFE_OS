'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RelationshipsError from '@/components/relationships/RelationshipsError';
import Toggle from '@/components/relationships/Toggle';
import { readRelationshipsResponse } from '@/lib/relationships/client';
import { addDays, formatHuman, todayPKT } from '@/lib/relationships/date';
import { POINTS } from '@/lib/relationships/scoring';

type FormState = {
  contactedParents: boolean;
  familyTies: boolean;
  helpedSomeone: boolean;
  goodDeed: boolean;
  communityObligation: boolean;
  charityAmount: number;
  goodDeedsCount: number;
  notes: string;
};

type LogResponse = { log: FormState | null; weeklyReflection: string };
type SaveState = 'idle' | 'saving' | 'saved';

const EMPTY: FormState = {
  contactedParents: false,
  familyTies: false,
  helpedSomeone: false,
  goodDeed: false,
  communityObligation: false,
  charityAmount: 0,
  goodDeedsCount: 0,
  notes: '',
};

export default function RelationshipsLogPage() {
  return (
    <Suspense fallback={<div role="status" className="py-12 text-center text-sm text-zinc-500">Loading log…</div>}>
      <RelationshipsLogPageInner />
    </Suspense>
  );
}

function RelationshipsLogPageInner() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');
  const [date, setDate] = useState(
    queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : todayPKT()
  );
  const [form, setForm] = useState<FormState>(EMPTY);
  const [weeklyReflection, setWeeklyReflection] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const load = useCallback(async (selectedDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/relationships/log?date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      );
      const data = await readRelationshipsResponse<LogResponse>(response);
      setForm(data.log
        ? {
            contactedParents: data.log.contactedParents,
            familyTies: data.log.familyTies,
            helpedSomeone: data.log.helpedSomeone,
            goodDeed: data.log.goodDeed,
            communityObligation: data.log.communityObligation,
            charityAmount: data.log.charityAmount,
            goodDeedsCount: data.log.goodDeedsCount,
            notes: data.log.notes ?? '',
          }
        : EMPTY);
      setWeeklyReflection(data.weeklyReflection);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this day’s log.');
    } finally {
      setLoading(false);
      setSaveState('idle');
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  async function save() {
    setSaveState('saving');
    setError(null);
    try {
      const response = await fetch('/api/relationships/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...form, weeklyReflection }),
      });
      await readRelationshipsResponse<{ ok: boolean }>(response);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (saveError) {
      setSaveState('idle');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this day’s log.');
    }
  }

  const toggleFields: { key: keyof typeof POINTS; label: string }[] = [
    { key: 'contactedParents', label: 'Contacted parents' },
    { key: 'familyTies', label: 'Maintained family ties' },
    { key: 'helpedSomeone', label: 'Helped someone' },
    { key: 'goodDeed', label: 'Good deed done' },
    { key: 'communityObligation', label: 'Community / social obligation' },
  ];
  const isToday = date === todayPKT();

  return (
    <div className="space-y-5">
      <RelationshipsError message={error} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Daily log</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-100">{formatHuman(date)}</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setDate((current) => addDays(current, -1))} aria-label="Previous day">‹</button>
          <button className="btn-secondary" onClick={() => setDate(todayPKT())} disabled={isToday}>Today</button>
          <button className="btn-secondary" onClick={() => setDate((current) => addDays(current, 1))} disabled={isToday} aria-label="Next day">›</button>
        </div>
      </header>

      {loading ? (
        <div role="status" className="card py-12 text-center text-sm text-zinc-500">Loading this day’s log…</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="label">Scored actions</h3>
            {toggleFields.map(({ key, label }) => (
              <Toggle
                key={key}
                label={label}
                sublabel={`${POINTS[key]} pts`}
                checked={form[key]}
                onChange={(value) => setForm((current) => ({ ...current, [key]: value }))}
              />
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="label">Tracked only — no score</h3>
            <label className="card block p-4">
              <span className="text-xs text-zinc-500">Charity given (PKR)</span>
              <input
                className="input mt-2"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.charityAmount || ''}
                onChange={(event) => setForm((current) => ({ ...current, charityAmount: Number(event.target.value) || 0 }))}
                placeholder="0"
              />
            </label>
            <label className="card block p-4">
              <span className="text-xs text-zinc-500">Good deeds count</span>
              <input
                className="input mt-2"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.goodDeedsCount || ''}
                onChange={(event) => setForm((current) => ({ ...current, goodDeedsCount: Number(event.target.value) || 0 }))}
                placeholder="0"
              />
            </label>
            <label className="card block p-4">
              <span className="text-xs text-zinc-500">Private notes</span>
              <textarea
                className="input mt-2 resize-y"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Anything worth remembering about today…"
                rows={3}
              />
            </label>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="label">Weekly reflection</h3>
              <p className="text-xs text-brand-400/80">Earns +15 points this week</p>
            </div>
            <label className="card block p-4">
              <span className="sr-only">Weekly reflection</span>
              <textarea
                className="input resize-y"
                value={weeklyReflection}
                onChange={(event) => setWeeklyReflection(event.target.value)}
                placeholder="A few honest lines about how your relationships went this week…"
                rows={4}
              />
            </label>
          </section>

          <button className="btn-primary w-full py-3" onClick={() => void save()} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save daily log'}
          </button>
        </div>
      )}
    </div>
  );
}
