'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookMarked, Check, Key, Loader2, Moon, Save } from 'lucide-react';
import { TOTAL_JUZ30_VERSES } from '@/lib/faith/quran-index';

type SettingsMap = Record<string, string | undefined>;

function boundedInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(0, parsed)) : fallback;
}

export default function FaithSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [verseIndex, setVerseIndex] = useState(0);
  const [hijriAdjustment, setHijriAdjustment] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/faith/settings?key=current_verse_index', { cache: 'no-store' }),
      fetch('/api/faith/settings?key=hijri_adjustment', { cache: 'no-store' }),
    ])
      .then(async ([verseResponse, hijriResponse]) => {
        if (!verseResponse.ok || !hijriResponse.ok) {
          throw new Error('Could not load Faith settings.');
        }
        const [verseData, hijriData] = await Promise.all([
          verseResponse.json() as Promise<Record<string, string | null>>,
          hijriResponse.json() as Promise<Record<string, string | null>>,
        ]);
        return {
          current_verse_index: verseData.current_verse_index ?? undefined,
          hijri_adjustment: hijriData.hijri_adjustment ?? undefined,
        };
      })
      .then((values) => {
        if (!active) return;
        setSettings(values);
        setVerseIndex(boundedInteger(values.current_verse_index, 0, TOTAL_JUZ30_VERSES - 1));
        const adjustment = Number(values.hijri_adjustment ?? -1);
        setHijriAdjustment([-1, 0, 1].includes(adjustment) ? adjustment : -1);
      })
      .catch(() => {
        if (active) setError('Could not load Faith settings. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/faith/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_verse_index: String(verseIndex),
          hijri_adjustment: String(hijriAdjustment),
        }),
      });
      if (!response.ok) throw new Error('Settings could not be saved.');
      setSettings((current) => ({
        ...(current ?? {}),
        current_verse_index: String(verseIndex),
        hijri_adjustment: String(hijriAdjustment),
      }));
      setSaved(true);
    } catch {
      setError('Could not save Faith settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 space-y-5 animate-fade-in">
      <header>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Faith</p>
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
      </header>

      {loading && <p role="status" className="text-sm text-zinc-500">Loading settings…</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="card space-y-4">
        <div>
          <p className="section-title mb-1">AI Guidance</p>
          <p className="text-sm text-zinc-400">
            Faith guidance uses the Gemini keys saved to your Kernel account.
          </p>
        </div>
        <Link href="/settings" className="btn-secondary inline-flex items-center gap-2">
          <Key className="w-4 h-4" />
          Manage Gemini keys in Kernel Settings
        </Link>
      </div>

      <div className="card space-y-4">
        <div>
          <p className="section-title mb-1">
            <span className="inline-flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Hijri Date
            </span>
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Adjust the calculated date to match local moon sighting announcements.
          </p>
        </div>
        <div className="flex gap-2">
          {([-1, 0, 1] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setHijriAdjustment(value)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                hijriAdjustment === value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
              }`}
            >
              {value === -1 ? '−1 day' : value === 0 ? 'Global' : '+1 day'}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <p className="section-title mb-0">Memorization Cursor</p>
        <label className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
          <BookMarked className="w-3 h-3" />
          Current Verse Index (0–{TOTAL_JUZ30_VERSES - 1})
        </label>
        <input
          type="number"
          className="input"
          min={0}
          max={TOTAL_JUZ30_VERSES - 1}
          value={verseIndex}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            setVerseIndex(boundedInteger(String(parsed), 0, TOTAL_JUZ30_VERSES - 1));
          }}
        />
        <p className="text-xs text-zinc-600">
          Index 0 starts at An-Nas:1; the final index is An-Naba:40.
        </p>
      </div>

      <button onClick={save} disabled={loading || saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save Settings'}
      </button>

      {settings && (
        <p className="text-center text-[10px] text-zinc-700">
          Your cursor and Hijri adjustments are stored privately in your Faith settings.
        </p>
      )}
    </div>
  );
}
