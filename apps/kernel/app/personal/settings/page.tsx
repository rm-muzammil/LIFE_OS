'use client';

import { useEffect, useState } from 'react';
import PersonalError from '@/components/personal/PersonalError';

export default function PersonalSettingsPage() {
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/personal/settings', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
        if (active) setHasGeminiKey(Boolean(data.hasGeminiKey));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load settings.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save() {
    if (!geminiKey.trim()) {
      setError('Enter a Gemini API key before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/personal/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      setHasGeminiKey(true);
      setGeminiKey('');
      setMessage('Gemini key saved to your Kernel account settings.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/personal/settings/gemini-generate', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      setMessage(`Generated ${data.plans?.length ?? 0} workout plans for this week.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate a workout plan.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <PersonalError message={error} />
      {message && <p role="status" className="text-sm text-brand-300">{message}</p>}
      {loading ? <p className="text-sm text-zinc-500">Loading settings…</p> : (
        <>
          <section className="card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Gemini · workout generation</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Personal uses your Kernel Gemini key settings. Keys are not returned to the browser.
              </p>
            </div>
            <label className="block text-sm text-zinc-400">
              Gemini API key {hasGeminiKey && <span className="ml-1 text-xs text-brand-300">configured</span>}
              <input
                type="password"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={hasGeminiKey ? 'Enter a replacement key' : 'Enter Gemini API key'}
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 focus:border-brand-500 focus:outline-none"
              />
            </label>
            <button type="button" onClick={() => void save()} disabled={saving} className="btn-secondary w-full">
              {saving ? 'Saving…' : 'Save Gemini key'}
            </button>
            <button type="button" onClick={() => void generatePlan()} disabled={generating || !hasGeminiKey} className="btn-primary w-full">
              {generating ? 'Generating…' : 'Generate this week’s workout plan'}
            </button>
            {!hasGeminiKey && <p className="text-center text-xs text-zinc-500">Save a key first to generate plans.</p>}
          </section>
          <section className="card space-y-2 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Training schedule</h2>
            <p className="text-sm text-zinc-400">Tuesday, Wednesday, Friday, Saturday, Sunday — training days.</p>
            <p className="text-sm text-zinc-400">Monday, Thursday — rest days.</p>
          </section>
        </>
      )}
    </div>
  );
}
