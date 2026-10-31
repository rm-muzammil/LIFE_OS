'use client';

import { useEffect, useState } from 'react';
import { readRelationshipsResponse } from '@/lib/relationships/client';
import { todayPKT } from '@/lib/relationships/date';
import RelationshipsError from '@/components/relationships/RelationshipsError';

type LogResponse = {
  weeklyReflection: string;
  weeklyReflectionKey: string;
};

type SaveState = 'idle' | 'saving' | 'saved';

export default function WeeklyReflectionEditor() {
  const [reflectionKey, setReflectionKey] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveState>('idle');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          `/api/relationships/log?date=${encodeURIComponent(todayPKT())}`,
          { cache: 'no-store' }
        );
        const data = await readRelationshipsResponse<LogResponse>(response);
        if (active) {
          setValue(data.weeklyReflection);
          setReflectionKey(data.weeklyReflectionKey);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this week’s reflection.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!reflectionKey) return;
    setStatus('saving');
    setError(null);
    try {
      const response = await fetch('/api/relationships/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: reflectionKey, value }),
      });
      await readRelationshipsResponse<{ ok: boolean }>(response);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1800);
    } catch (saveError) {
      setStatus('idle');
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this week’s reflection.');
    }
  }

  if (loading) {
    return <div role="status" className="card px-4 py-6 text-center text-sm text-zinc-500">Loading reflection…</div>;
  }

  return (
    <div className="space-y-3">
      <RelationshipsError message={error} />
      <div className="card space-y-3 p-4">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={4}
          placeholder="A few honest lines about how your relationships went this week…"
          className="input resize-y"
        />
        <button className="btn-primary w-full" onClick={() => void save()} disabled={status === 'saving' || !reflectionKey}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save reflection'}
        </button>
      </div>
    </div>
  );
}
