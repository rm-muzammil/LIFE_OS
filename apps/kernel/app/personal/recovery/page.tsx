'use client';

import { useEffect, useState } from 'react';
import PersonalError from '@/components/personal/PersonalError';
import SectionCard from '@/components/personal/SectionCard';
import Slider from '@/components/personal/Slider';
import Toggle from '@/components/personal/Toggle';
import { todayISO } from '@/lib/personal/scoring';

interface DailyLog {
  sleepHours?: number | null;
  productiveHours?: number | null;
  socialMediaOk?: boolean | null;
}

export default function PersonalRecoveryPage() {
  const today = todayISO();
  const [sleep, setSleep] = useState(0);
  const [productive, setProductive] = useState(0);
  const [socialOk, setSocialOk] = useState(false);
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
          setSleep(log.sleepHours ?? 0);
          setProductive(log.productiveHours ?? 0);
          setSocialOk(log.socialMediaOk ?? false);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load recovery data.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [today]);

  const score = (Math.min(sleep, 7) / 7) * 10 + (productive >= 6 ? 3 : 0) + (socialOk ? 2 : 0);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/personal/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, sleepHours: sleep, productiveHours: productive, socialMediaOk: socialOk }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      setMessage('Recovery saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save recovery.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PersonalError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}
      {loading ? <p className="text-sm text-zinc-500">Loading recovery…</p> : (
        <>
          {!hasLog && <p className="text-sm text-zinc-500">No recovery log for today yet.</p>}
          <SectionCard title="Recovery" score={score} maxScore={15}>
            <Slider value={sleep} onChange={setSleep} min={0} max={10} step={0.5} label="Sleep hours" points="up to 10 pts" display={`${sleep}h`} />
            <p className="text-xs text-zinc-500">Target: 7h · Current: {Math.round((Math.min(sleep, 7) / 7) * 10 * 10) / 10} pts</p>
            <Slider value={productive} onChange={setProductive} min={0} max={16} step={0.5} label="Productive hours" points="+3 pts if ≥6h" display={`${productive}h`} />
            <Toggle value={socialOk} onChange={setSocialOk} label="Social media ≤30 min" points="+2 pts" />
          </SectionCard>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save recovery'}
          </button>
        </>
      )}
    </div>
  );
}
