'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { jsonBody, plannerRequest } from '@/lib/planner/client';
import type { PlannerSettings } from '@/lib/planner/types';

interface SettingsResponse {
  settings: PlannerSettings;
}

export default function PlannerSettingsPage() {
  const [settings, setSettings] = useState<PlannerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    plannerRequest<SettingsResponse>('/api/planner/settings', { cache: 'no-store' })
      .then(({ settings: value }) => { if (active) setSettings(value); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load planner settings.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof PlannerSettings>(key: K, value: PlannerSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const response = await plannerRequest<SettingsResponse>('/api/planner/settings', {
        method: 'PUT',
        ...jsonBody({
          wakeTime: settings.wakeTime,
          sleepTime: settings.sleepTime,
          prayerBlockMinutes: settings.prayerBlockMinutes,
          prayerBufferBeforeMinutes: settings.prayerBufferBeforeMinutes,
          jumuahBlockMinutes: settings.jumuahBlockMinutes,
          breakMinutes: settings.breakMinutes,
          minSessionMinutes: settings.minSessionMinutes,
          prayerAuto: settings.prayerAuto,
          prayerCity: settings.prayerCity,
          prayerCountry: settings.prayerCountry,
          prayerMethod: settings.prayerMethod,
          prayerAsrSchool: settings.prayerAsrSchool,
          preferredSessionMinutes: settings.preferredSessionMinutes,
          stretchEnabled: settings.stretchEnabled,
          stretchCapPercent: settings.stretchCapPercent,
          maxDailyFocusMinutes: settings.maxDailyFocusMinutes,
        }),
      });
      setSettings(response.settings);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save planner settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      {loading && <p role="status" className="text-sm text-zinc-500">Loading settings…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {settings && (
        <form onSubmit={submit} className="space-y-5">
          <section className="card space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Day boundaries</h2>
              <p className="mt-1 text-xs text-zinc-500">Times are interpreted as Asia/Karachi wall-clock times. Planning ends at midnight.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Wake time</span>
                <input className="input" type="time" required value={settings.wakeTime} onChange={(event) => update('wakeTime', event.target.value)} />
              </label>
              <label>
                <span className="label">Sleep time</span>
                <input className="input" type="time" required value={settings.sleepTime} onChange={(event) => update('sleepTime', event.target.value)} />
              </label>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Prayer blocks</h2>
              <p className="mt-1 text-xs text-zinc-500">The buffer is placed before each prayer time; block duration follows it.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="Prayer block duration (minutes)" value={settings.prayerBlockMinutes} min={1} max={360} onChange={(value) => update('prayerBlockMinutes', value)} />
              <NumberInput label="Buffer before prayers (minutes)" value={settings.prayerBufferBeforeMinutes} min={0} max={180} onChange={(value) => update('prayerBufferBeforeMinutes', value)} />
              <NumberInput label="Friday Dhuhr / Jumuah block (minutes)" value={settings.jumuahBlockMinutes} min={1} max={360} onChange={(value) => update('jumuahBlockMinutes', value)} />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <input className="mt-1" type="checkbox" checked={settings.prayerAuto} onChange={(event) => update('prayerAuto', event.target.checked)} />
              <span>
                <span className="block text-sm text-zinc-200">Fetch prayer times automatically</span>
                <span className="mt-1 block text-xs text-zinc-500">Uses Aladhan with your city, country, calculation method, and Asr school.</span>
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">City</span>
                <input className="input" maxLength={100} value={settings.prayerCity ?? ''} onChange={(event) => update('prayerCity', event.target.value || null)} />
              </label>
              <label>
                <span className="label">Country</span>
                <input className="input" maxLength={100} value={settings.prayerCountry ?? ''} onChange={(event) => update('prayerCountry', event.target.value || null)} />
              </label>
              <NumberInput label="Aladhan method ID" value={settings.prayerMethod} min={0} max={99} onChange={(value) => update('prayerMethod', value)} />
              <label>
                <span className="label">Asr school</span>
                <select className="input" value={settings.prayerAsrSchool} onChange={(event) => update('prayerAsrSchool', Number(event.target.value))}>
                  <option value={0}>Shafi</option>
                  <option value={1}>Hanafi</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Planning preferences</h2>
              <p className="mt-1 text-xs text-zinc-500">Controls session lengths, breaks, and optional stretch sessions.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="Break between sessions (minutes)" value={settings.breakMinutes} min={0} max={180} onChange={(value) => update('breakMinutes', value)} />
              <NumberInput label="Minimum learning session (minutes)" value={settings.minSessionMinutes} min={1} max={1440} onChange={(value) => update('minSessionMinutes', value)} />
              <NumberInput label="Preferred track session (minutes)" value={settings.preferredSessionMinutes} min={10} max={240} onChange={(value) => update('preferredSessionMinutes', value)} />
              <NumberInput label="Stretch cap (% of weekly target)" value={settings.stretchCapPercent} min={100} max={300} help="Limits each track’s weekly quota plus extras." onChange={(value) => update('stretchCapPercent', value)} />
              <NumberInput label="Maximum daily focus (minutes)" value={settings.maxDailyFocusMinutes} min={60} max={720} help="Caps planned task, quota, and extra focus minutes each day." onChange={(value) => update('maxDailyFocusMinutes', value)} />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <input className="mt-1" type="checkbox" checked={settings.stretchEnabled} onChange={(event) => update('stretchEnabled', event.target.checked)} />
              <span>
                <span className="block text-sm text-zinc-200">Stretch mode</span>
                <span className="mt-1 block text-xs text-zinc-500">Offer remaining capacity as optional extra track sessions after due work and weekly quota sessions.</span>
              </span>
            </label>
          </section>

          <button type="submit" disabled={saving || loading} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save settings'}
          </button>
        </form>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  help?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        required
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {help && <span className="mt-1 block text-[11px] text-zinc-500">{help}</span>}
    </label>
  );
}
