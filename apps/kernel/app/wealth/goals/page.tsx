'use client';

import { useState } from 'react';
import { useWealthStore } from '@/lib/wealth/useStore';
import { goalRequiredMonthly, goalSaved } from '@/lib/wealth/calc';
import type { Goal, Transaction } from '@/lib/wealth/types';
import { pkr } from '@/lib/wealth/currency';
import WealthError from '@/components/wealth/WealthError';

export default function WealthGoalsPage() {
  const goals = useWealthStore<Goal>('goals');
  const transactions = useWealthStore<Transaction>('transactions');
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Med');
  const [saving, setSaving] = useState(false);

  async function addGoal() {
    if (!name || !targetAmount || !deadline) return;
    setSaving(true);
    const saved = await goals.create({
      name,
      targetAmount: Number(targetAmount),
      deadline: new Date(deadline).toISOString(),
      priority,
      status: 'Active',
    });
    setSaving(false);
    if (saved) {
      setName('');
      setTargetAmount('');
      setDeadline('');
    }
  }

  return (
    <div className="space-y-5">
      <WealthError message={goals.error || transactions.error} />
      <div className="card space-y-4 p-5">
        <label className="label">
          Goal name
          <input className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Target amount (PKR)
            <input className="input mt-1" type="number" min="0" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} />
          </label>
          <label className="label">
            Deadline
            <input className="input mt-1" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </label>
        </div>
        <label className="label">
          Priority
          <select className="input mt-1" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option>High</option><option>Med</option><option>Low</option>
          </select>
        </label>
        <button className="btn-primary w-full" onClick={addGoal} disabled={saving || !name || !targetAmount || !deadline}>
          {saving ? 'Saving…' : 'Add goal'}
        </button>
      </div>

      {goals.loading || transactions.loading ? (
        <p className="text-sm text-zinc-500">Loading goals…</p>
      ) : goals.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No goals yet.</p>
      ) : (
        <div className="space-y-3">
          {goals.items.map((goal) => {
            const saved = goalSaved(goal, transactions.items);
            const monthly = goalRequiredMonthly(goal, saved);
            const percent = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
            return (
              <div key={goal.id} className="card space-y-3 p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-zinc-100">{goal.name}</span>
                  <button className="text-xs text-zinc-500 hover:text-red-400" onClick={() => void goals.remove(goal.id)}>
                    Delete
                  </button>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{pkr(saved)} / {pkr(goal.targetAmount)}</span>
                  <span>{monthly > 0 ? `${pkr(monthly)}/mo needed` : 'Target reached'}</span>
                </div>
                <label className="label">
                  Status
                  <select
                    className="input mt-1 text-sm"
                    value={goal.status}
                    onChange={(event) => void goals.update(goal.id, { status: event.target.value })}
                  >
                    <option>Active</option><option>Paused</option><option>Achieved</option>
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
