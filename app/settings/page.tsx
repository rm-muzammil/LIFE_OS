'use client';

import { useEffect, useState } from 'react';
import type { ProvinceWithMeta } from '@/lib/types';

export default function SettingsPage() {
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);

  useEffect(() => {
    fetch('/api/provinces',{ cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setProvinces(d.provinces ?? []));
  }, []);

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
          Derived from the most recent <code>lastPulledAt</code> across all provinces.
        </p>
      </div>

      <div className="card p-6 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Vercel Cron Config
        </h2>
        <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-zinc-400">
{`// vercel.json
{
  "crons": [{ "path": "/api/cron/pull-provinces", "schedule": "0 0 * * *" }]
}`}
        </pre>
        <p className="text-xs text-zinc-600">
          Runs daily at 00:00 UTC. Set <code>CRON_SECRET</code> in your Vercel env vars to secure this
          endpoint — Vercel automatically sends it as a Bearer token.
        </p>
      </div>
    </div>
  );
}
