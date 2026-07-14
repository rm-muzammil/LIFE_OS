'use client';

import { useEffect, useState } from 'react';
import { isoWeekPKT } from '@/lib/time';
import type { WeeklyReview } from '@/db/schema';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY = {
  wentWell: '',
  wentWrong: '',
  distractions: '',
  mustImprove: '',
  intentions: '',
  missionAlignScore: 3,
  missionAlignNote: '',
};

export default function ReviewPage() {
  const [weeks, setWeeks] = useState<WeeklyReview[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentWeek = isoWeekPKT();

  async function load() {
    const res = await fetch('/api/review');
    const data = await res.json();
    const rows: WeeklyReview[] = data.weeks ?? [];
    setWeeks(rows);
    const existing = rows.find((w) => w.isoWeek === currentWeek);
    if (existing) {
      setForm({
        wentWell: existing.wentWell,
        wentWrong: existing.wentWrong,
        distractions: existing.distractions,
        mustImprove: existing.mustImprove,
        intentions: existing.intentions,
        missionAlignScore: existing.missionAlignScore ?? 3,
        missionAlignNote: existing.missionAlignNote,
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
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isoWeek: currentWeek }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const past = weeks.filter((w) => w.isoWeek !== currentWeek);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Weekly Review</h1>
        <p className="text-sm text-zinc-500 mt-1">Week {currentWeek}</p>
      </header>

      <div className="card p-6 space-y-5">
        <Field
          label="What went well?"
          value={form.wentWell}
          onChange={(v) => setForm((f) => ({ ...f, wentWell: v }))}
        />
        <Field
          label="What went wrong?"
          value={form.wentWrong}
          onChange={(v) => setForm((f) => ({ ...f, wentWrong: v }))}
        />
        <Field
          label="Distractions"
          value={form.distractions}
          onChange={(v) => setForm((f) => ({ ...f, distractions: v }))}
        />
        <Field
          label="What must improve?"
          value={form.mustImprove}
          onChange={(v) => setForm((f) => ({ ...f, mustImprove: v }))}
        />
        <Field
          label="Intentions for next week"
          value={form.intentions}
          onChange={(v) => setForm((f) => ({ ...f, intentions: v }))}
        />

        <div>
          <label className="label">Mission Alignment (1–5)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form.missionAlignScore}
              onChange={(e) =>
                setForm((f) => ({ ...f, missionAlignScore: Number(e.target.value) }))
              }
              className="flex-1 accent-brand-500"
            />
            <span className="text-sm tabular-nums text-zinc-500 w-10 text-right">
              {form.missionAlignScore} / 5
            </span>
          </div>
          <textarea
            className="input mt-2"
            rows={2}
            placeholder="One line note…"
            value={form.missionAlignNote}
            onChange={(e) => setForm((f) => ({ ...f, missionAlignNote: e.target.value }))}
          />
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save This Week'}
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Past Weeks
        </h2>
        <div className="space-y-2">
          {past.length === 0 && <p className="text-sm text-zinc-600">No past reviews yet.</p>}
          {past.map((w) => {
            const isOpen = expanded === w.isoWeek;
            return (
              <div key={w.isoWeek} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : w.isoWeek)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium"
                >
                  {w.isoWeek}
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3 text-sm text-zinc-400 border-t border-zinc-800 pt-4">
                    <ReadField label="Went well" value={w.wentWell} />
                    <ReadField label="Went wrong" value={w.wentWrong} />
                    <ReadField label="Distractions" value={w.distractions} />
                    <ReadField label="Must improve" value={w.mustImprove} />
                    <ReadField label="Intentions" value={w.intentions} />
                    <ReadField
                      label="Mission alignment"
                      value={`${w.missionAlignScore ?? '—'}/5 — ${w.missionAlignNote}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-zinc-600 uppercase tracking-wide">{label}</p>
      <p className="text-zinc-300 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
