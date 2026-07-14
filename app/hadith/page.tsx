'use client';

import { useEffect, useState } from 'react';
import { isoWeekPKT } from '@/lib/time';
import type { HadithLog } from '@/db/schema';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY = { arabicText: '', translation: '', source: '', reflection: '' };

export default function HadithPage() {
  const [weeks, setWeeks] = useState<HadithLog[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentWeek = isoWeekPKT();

  async function load() {
    const res = await fetch('/api/hadith');
    const data = await res.json();
    const rows: HadithLog[] = data.weeks ?? [];
    setWeeks(rows);
    const existing = rows.find((w) => w.isoWeek === currentWeek);
    if (existing) {
      setForm({
        arabicText: existing.arabicText,
        translation: existing.translation,
        source: existing.source,
        reflection: existing.reflection,
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
      await fetch('/api/hadith', {
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
        <h1 className="text-2xl font-bold">Hadith</h1>
        <p className="text-sm text-zinc-500 mt-1">Week {currentWeek}</p>
      </header>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Arabic Text</label>
          <textarea
            className="input font-arabic text-lg text-right"
            dir="rtl"
            rows={3}
            value={form.arabicText}
            onChange={(e) => setForm((f) => ({ ...f, arabicText: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Translation</label>
          <textarea
            className="input"
            rows={3}
            value={form.translation}
            onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Source</label>
          <input
            className="input"
            placeholder="e.g. Sahih Muslim 1234"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Personal Reflection</label>
          <textarea
            className="input"
            rows={4}
            value={form.reflection}
            onChange={(e) => setForm((f) => ({ ...f, reflection: e.target.value }))}
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
          {past.length === 0 && <p className="text-sm text-zinc-600">No past entries yet.</p>}
          {past.map((w) => {
            const isOpen = expanded === w.isoWeek;
            return (
              <div key={w.isoWeek} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : w.isoWeek)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium"
                >
                  {w.isoWeek} {w.source && <span className="text-zinc-600 ml-2">{w.source}</span>}
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3 text-sm border-t border-zinc-800 pt-4">
                    {w.arabicText && (
                      <p className="font-arabic text-lg text-right text-zinc-200" dir="rtl">
                        {w.arabicText}
                      </p>
                    )}
                    {w.translation && <p className="text-zinc-400">{w.translation}</p>}
                    {w.reflection && (
                      <div>
                        <p className="text-xs text-zinc-600 uppercase tracking-wide">Reflection</p>
                        <p className="text-zinc-300 whitespace-pre-wrap">{w.reflection}</p>
                      </div>
                    )}
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
