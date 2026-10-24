'use client';

import { useState } from 'react';
import { useWealthStore } from '@/lib/wealth/useStore';
import type { Transaction } from '@/lib/wealth/types';
import { pkr } from '@/lib/wealth/currency';
import WealthError from '@/components/wealth/WealthError';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Scholarship', 'Other income'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Education', 'Sadaqah', 'Debt payment', 'Other expense'];
const SUB_TAGS = ['Need', 'Want', 'Sadaqah', 'Zakat-eligible', 'None'];

export default function WealthTransactionsPage() {
  const store = useWealthStore<Transaction>('transactions');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [subTag, setSubTag] = useState('None');
  const [halalVerified, setHalalVerified] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function addTransaction() {
    if (!amount || !Number.isFinite(Number(amount))) return;
    setSaving(true);
    const saved = await store.create({
      date: new Date().toISOString(),
      type,
      amount: Number(amount),
      category,
      subTag,
      halalVerified,
      recurring,
      notes: notes || null,
    });
    setSaving(false);
    if (saved) {
      setAmount('');
      setNotes('');
      setHalalVerified(false);
      setRecurring(false);
    }
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-5">
      <WealthError message={store.error} />
      <div className="card space-y-4 p-5">
        <div className="flex gap-2">
          {(['expense', 'income'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setType(value);
                setCategory(value === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                type === value ? 'bg-brand-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {value === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
        <label className="label">
          Amount (PKR)
          <input
            className="input mt-1"
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />
        </label>
        <label className="label">
          Category
          <select className="input mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="label">
          Tag
          <select className="input mt-1" value={subTag} onChange={(event) => setSubTag(event.target.value)}>
            {SUB_TAGS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="label">
          Notes
          <input className="input mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
          {type === 'income' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={halalVerified} onChange={(event) => setHalalVerified(event.target.checked)} />
              Halal-verified
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
            Recurring
          </label>
        </div>
        <button className="btn-primary w-full" onClick={addTransaction} disabled={saving || !amount}>
          {saving ? 'Saving…' : `Add ${type}`}
        </button>
      </div>

      {store.loading ? (
        <p className="text-sm text-zinc-500">Loading transactions…</p>
      ) : store.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {store.items.map((transaction) => (
            <div key={transaction.id} className="card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">
                  {transaction.category}<span className="font-normal text-zinc-500"> · {transaction.subTag}</span>
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {new Date(transaction.date).toLocaleDateString()}
                  {transaction.notes ? ` · ${transaction.notes}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`text-sm font-medium ${transaction.type === 'income' ? 'text-brand-300' : 'text-zinc-200'}`}>
                  {transaction.type === 'income' ? '+' : '−'}{pkr(transaction.amount)}
                </span>
                <button className="text-xs text-zinc-500 hover:text-red-400" onClick={() => void store.remove(transaction.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
