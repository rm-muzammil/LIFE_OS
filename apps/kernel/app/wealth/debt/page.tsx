'use client';

import { useState } from 'react';
import { useWealthStore } from '@/lib/wealth/useStore';
import { debtPaid } from '@/lib/wealth/calc';
import type { Debt, Transaction } from '@/lib/wealth/types';
import { pkr } from '@/lib/wealth/currency';
import WealthError from '@/components/wealth/WealthError';

export default function WealthDebtPage() {
  const debts = useWealthStore<Debt>('debts');
  const transactions = useWealthStore<Transaction>('transactions');
  const [lender, setLender] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [payoffDeadline, setPayoffDeadline] = useState('');
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [saving, setSaving] = useState(false);

  async function addDebt() {
    if (!lender || !totalAmount) return;
    setSaving(true);
    const saved = await debts.create({
      lender,
      totalAmount: Number(totalAmount),
      payoffDeadline: payoffDeadline ? new Date(payoffDeadline).toISOString() : null,
      monthlyCommitment: Number(monthlyCommitment) || 0,
    });
    setSaving(false);
    if (saved) {
      setLender('');
      setTotalAmount('');
      setPayoffDeadline('');
      setMonthlyCommitment('');
    }
  }

  return (
    <div className="space-y-5">
      <WealthError message={debts.error || transactions.error} />
      <p className="text-xs text-zinc-500">Interest-free debt only — matches Islamic finance principles.</p>
      <div className="card space-y-4 p-5">
        <label className="label">
          Lender
          <input className="input mt-1" value={lender} onChange={(event) => setLender(event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Total amount (PKR)
            <input className="input mt-1" type="number" min="0" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} />
          </label>
          <label className="label">
            Monthly commitment (PKR)
            <input className="input mt-1" type="number" min="0" value={monthlyCommitment} onChange={(event) => setMonthlyCommitment(event.target.value)} />
          </label>
        </div>
        <label className="label">
          Payoff deadline
          <input className="input mt-1" type="date" value={payoffDeadline} onChange={(event) => setPayoffDeadline(event.target.value)} />
        </label>
        <button className="btn-primary w-full" onClick={addDebt} disabled={saving || !lender || !totalAmount}>
          {saving ? 'Saving…' : 'Add debt'}
        </button>
      </div>

      {debts.loading || transactions.loading ? (
        <p className="text-sm text-zinc-500">Loading debts…</p>
      ) : debts.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No debts tracked.</p>
      ) : (
        <div className="space-y-3">
          {debts.items.map((debt) => {
            const paid = debtPaid(debt, transactions.items);
            return (
              <div key={debt.id} className="card space-y-2 p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-zinc-100">{debt.lender}</span>
                  <button className="text-xs text-zinc-500 hover:text-red-400" onClick={() => void debts.remove(debt.id)}>
                    Delete
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Paid {pkr(paid)} of {pkr(debt.totalAmount)} · Remaining {pkr(debt.totalAmount - paid)}
                </p>
                <p className="text-xs text-zinc-600">
                  {debt.monthlyCommitment ? `${pkr(debt.monthlyCommitment)}/mo` : ''}
                  {debt.payoffDeadline ? ` · due ${new Date(debt.payoffDeadline).toLocaleDateString()}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
