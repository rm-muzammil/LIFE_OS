'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Check, Loader2, LogOut } from 'lucide-react';
import type { ProvinceWithMeta } from '@/lib/types';

interface UserSettingsResponse {
  geminiKey1: string | null;
  geminiKey2: string | null;
  geminiKey3: string | null;
  hasAnyKey: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);

  const [savedKeys, setSavedKeys] = useState<UserSettingsResponse | null>(null);
  const [keyInputs, setKeyInputs] = useState({ geminiKey1: '', geminiKey2: '', geminiKey3: '' });
  const [savingKeys, setSavingKeys] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetch('/api/provinces', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setProvinces(d.provinces ?? []));

    fetch('/api/user-settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: UserSettingsResponse) => setSavedKeys(d));
  }, []);

  async function saveGeminiKeys() {
    setSavingKeys(true);
    try {
      const payload: Record<string, string> = {};
      // Only send fields the user actually typed something into — leaves
      // previously-saved keys untouched otherwise.
      if (keyInputs.geminiKey1.trim()) payload.geminiKey1 = keyInputs.geminiKey1.trim();
      if (keyInputs.geminiKey2.trim()) payload.geminiKey2 = keyInputs.geminiKey2.trim();
      if (keyInputs.geminiKey3.trim()) payload.geminiKey3 = keyInputs.geminiKey3.trim();

      await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const refreshed = await fetch('/api/user-settings', { cache: 'no-store' }).then((r) => r.json());
      setSavedKeys(refreshed);
      setKeyInputs({ geminiKey1: '', geminiKey2: '', geminiKey3: '' });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSavingKeys(false);
    }
  }

  const lastPull = provinces
    .map((p) => p.lastPulledAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      {session?.user && (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Profile</h2>
          <div className="flex items-center gap-4">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? 'Profile'}
                className="w-12 h-12 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-lg font-semibold">
                {(session.user.name ?? session.user.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{session.user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Gemini API Keys</h2>
          <p className="text-xs text-zinc-600 mt-1">
            Used for AI schedule generation and chat replies. Falls back to the shared server keys if
            you leave these empty. Get free keys at{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-brand-400 hover:underline"
            >
              aistudio.google.com/apikey
            </a>
            .
          </p>
        </div>

        {(['geminiKey1', 'geminiKey2', 'geminiKey3'] as const).map((field, i) => (
          <div key={field} className="space-y-1">
            <label className="text-xs text-zinc-500">Key {i + 1}</label>
            <input
              type="password"
              value={keyInputs[field]}
              onChange={(e) => setKeyInputs((prev) => ({ ...prev, [field]: e.target.value }))}
              placeholder={savedKeys?.[field] ?? 'Not set'}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-brand-500"
            />
          </div>
        ))}

        <button
          onClick={saveGeminiKeys}
          disabled={savingKeys}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-brand-400 transition-colors disabled:opacity-50"
        >
          {savingKeys ? (
            <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          ) : savedFlash ? (
            <Check size={16} strokeWidth={2} />
          ) : null}
          {savedFlash ? 'Saved' : 'Save keys'}
        </button>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">App Info</h2>
        <div className="text-sm text-zinc-400 space-y-1">
          <p>Self-Khilafah v2 — life governance kernel</p>
          <p>Next.js 14 · Neon (serverless Postgres) · Drizzle ORM · Vercel</p>
          <p>Timezone: Asia/Karachi (PKT), always</p>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Cron Status</h2>
        <p className="text-sm text-zinc-400">
          Last pull run:{' '}
          {lastPull ? (
            <span className="text-zinc-200">
              {new Date(lastPull as string).toLocaleString('en-US', {
                timeZone: 'Asia/Karachi',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          ) : (
            <span className="text-zinc-600">never</span>
          )}
        </p>
        <p className="text-xs text-zinc-600">
          Derived from the most recent <code>lastPulledAt</code> across your provinces.
        </p>
      </div>

      <div className="card p-6 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Vercel Cron Config
        </h2>
        <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-zinc-400">
{`// vercel.json
{
  "crons": [
    { "path": "/api/cron/pull-provinces", "schedule": "0 18 * * *" },
    { "path": "/api/cron/generate-schedule", "schedule": "0 19 * * *" },
    { "path": "/api/cron/generate-schedule", "schedule": "0 20 * * *" }
  ]
}`}
        </pre>
        <p className="text-xs text-zinc-600">
          Pulls provinces at 18:00 UTC, generates schedules at 19:00 UTC, then retries
          at 20:00 UTC (a no-op if 19:00 already succeeded) — for every registered user.
          Set <code>CRON_SECRET</code> and <code>SCHEDULER_API_SECRET</code> in your
          Vercel env vars to secure these routes.
        </p>
      </div>
    </div>
  );
}
