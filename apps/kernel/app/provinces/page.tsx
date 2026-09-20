'use client';

import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import type { ProvinceWithMeta } from '@/lib/types';

export default function ProvincesPage() {
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/provinces', { cache: 'no-store' });
    const data = await res.json();
    setProvinces(data.provinces ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateWeight(slug: string, weight: number) {
    await fetch(`/api/provinces/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight }),
    });
    load();
  }

  async function toggleActive(slug: string, active: boolean) {
    await fetch(`/api/provinces/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function remove(slug: string) {
    await fetch(`/api/provinces/${slug}`, { method: 'DELETE' });
    setConfirmDelete(null);
    load();
  }

  async function resetToDefaults() {
    setResetting(true);
    try {
      await fetch('/api/provinces/reset', { method: 'POST' });
      setConfirmReset(false);
      await load();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provinces</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Auto-registered on sign-in. Adjust weights and active status below.
          </p>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RotateCcw size={16} /> Reset to defaults
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Active</th>
                <th className="py-3 px-4">Last Push</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {provinces.map((p) => (
                <tr key={p.slug} className="border-b border-zinc-900">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4 text-zinc-500">{p.slug}</td>
                  <td className="py-3 px-4 text-zinc-500 max-w-[160px] truncate">
                    {p.url ? (
                      <a href={p.url} target="_blank" className="hover:text-brand-400">
                        {p.url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      defaultValue={p.weight}
                      onBlur={(e) => updateWeight(p.slug, Number(e.target.value))}
                      className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleActive(p.slug, !p.active)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        p.active ? 'bg-brand-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          p.active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 text-xs">
                    {p.lastPushedAt
                      ? new Date(p.lastPushedAt).toLocaleString('en-US', {
                          timeZone: 'Asia/Karachi',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'never'}
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {p.cachedScore != null ? Math.round(p.cachedScore) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {confirmDelete === p.slug ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => remove(p.slug)} className="text-red-400 text-xs font-medium">
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-zinc-500 text-xs">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(p.slug)} className="text-zinc-600 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-red-400">Reset to defaults?</h2>
              <button onClick={() => setConfirmReset(false)}>
                <X size={18} className="text-zinc-500" />
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              This deletes every province you currently have — including any custom ones you added —
              and recreates the 6 defaults (Faith, Personal, Wealth, Roadmap, Relationships, Work).
              Past life-score history for the 6 default provinces is preserved; a custom province's
              history is not.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={resetToDefaults}
                disabled={resetting}
                className="flex-1 rounded-xl bg-red-500 text-white font-medium px-4 py-2 hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
