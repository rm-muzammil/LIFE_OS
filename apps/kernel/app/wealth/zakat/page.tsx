'use client';

import { useState } from 'react';
import { useWealthStore } from '@/lib/wealth/useStore';
import { zakatAmount, zakatDueDate } from '@/lib/wealth/calc';
import type { ZakatAsset } from '@/lib/wealth/types';
import { pkr } from '@/lib/wealth/currency';
import WealthError from '@/components/wealth/WealthError';

export default function WealthZakatPage() {
  const store = useWealthStore<ZakatAsset>('zakat');
  const [assetName, setAssetName] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [nisabThreshold, setNisabThreshold] = useState('');
  const [hawlStartDate, setHawlStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [eligible, setEligible] = useState(true);
  const [saving, setSaving] = useState(false);

  async function addAsset() {
    if (!assetName || !currentValue) return;
    setSaving(true);
    const saved = await store.create({
      assetName,
      currentValue: Number(currentValue),
      zakatEligible: eligible,
      nisabThreshold: Number(nisabThreshold) || 0,
      hawlStartDate: new Date(hawlStartDate).toISOString(),
      paid: false,
    });
    setSaving(false);
    if (saved) {
      setAssetName('');
      setCurrentValue('');
      setNisabThreshold('');
    }
  }

  const totalDue = store.items.reduce((sum, asset) => sum + (asset.paid ? 0 : zakatAmount(asset)), 0);

  return (
    <div className="space-y-5">
      <WealthError message={store.error} />
      <div className="card p-5">
        <p className="text-sm text-zinc-500">Zakat due (unpaid)</p>
        <p className="mt-1 text-2xl font-medium text-brand-300">{pkr(totalDue)}</p>
      </div>
      <div className="card space-y-4 p-5">
        <label className="label">
          Asset name
          <input className="input mt-1" value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="Cash, gold, savings…" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Current value (PKR)
            <input className="input mt-1" type="number" min="0" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} />
          </label>
          <label className="label">
            Nisab threshold (PKR)
            <input className="input mt-1" type="number" min="0" value={nisabThreshold} onChange={(event) => setNisabThreshold(event.target.value)} />
          </label>
        </div>
        <label className="label">
          Hawl start date
          <input className="input mt-1" type="date" value={hawlStartDate} onChange={(event) => setHawlStartDate(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={eligible} onChange={(event) => setEligible(event.target.checked)} />
          Zakat-eligible
        </label>
        <button className="btn-primary w-full" onClick={addAsset} disabled={saving || !assetName || !currentValue}>
          {saving ? 'Saving…' : 'Add asset'}
        </button>
      </div>

      {store.loading ? (
        <p className="text-sm text-zinc-500">Loading zakat assets…</p>
      ) : store.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No zakat-eligible assets tracked yet.</p>
      ) : (
        <div className="space-y-3">
          {store.items.map((asset) => (
            <div key={asset.id} className="card space-y-2 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-100">{asset.assetName}</span>
                <button className="text-xs text-zinc-500 hover:text-red-400" onClick={() => void store.remove(asset.id)}>
                  Delete
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Value {pkr(asset.currentValue)} · Due {zakatDueDate(asset.hawlStartDate).toLocaleDateString()}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-brand-300">Zakat: {pkr(zakatAmount(asset))}</span>
                <label className="flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={asset.paid}
                    onChange={(event) => void store.update(asset.id, { paid: event.target.checked })}
                  />
                  Paid
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
