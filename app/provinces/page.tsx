'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Trash2, Plus, X } from 'lucide-react';
import type { ProvinceWithMeta } from '@/lib/types';

export default function ProvincesPage() {
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKeys, setNewKeys] = useState<{ rawApiKey: string; pullSecret: string; slug: string } | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', url: '', weight: 0.1 });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/provinces');
    const data = await res.json();
    setProvinces(data.provinces ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    const res = await fetch('/api/provinces/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKeys({ rawApiKey: data.rawApiKey, pullSecret: data.pullSecret, slug: form.slug });
      setForm({ name: '', slug: '', url: '', weight: 0.1 });
      setShowForm(false);
      load();
    } else {
      alert(data.error ?? 'Failed to register province');
    }
  }

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

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provinces</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage the 6 provinces reporting into Self-Khilafah</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New
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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Register Province</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={18} className="text-zinc-500" />
              </button>
            </div>
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                className="input"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">URL</label>
              <input
                className="input"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Weight (0–1)</label>
              <input
                type="number"
                step={0.01}
                min={0}
                max={1}
                className="input"
                value={form.weight}
                onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))}
              />
            </div>
            <button onClick={register} className="btn-primary w-full">
              Register
            </button>
          </div>
        </div>
      )}

      {newKeys && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-brand-400">
              Credentials for {newKeys.slug} — copy now, shown once
            </h2>
            <CopyField label="X-Api-Key (push)" value={newKeys.rawApiKey} />
            <CopyField label="Pull Secret (Bearer)" value={newKeys.pullSecret} />
            <button onClick={() => setNewKeys(null)} className="btn-secondary w-full">
              I've copied these — Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <code className="input text-xs break-all">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn-secondary shrink-0 px-3"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
