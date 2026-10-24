import type { Debt, Goal, Transaction, ZakatAsset } from '@/lib/wealth/types';

const LUNAR_YEAR_DAYS = 354;

export function zakatDueDate(hawlStartDate: string): Date {
  const start = new Date(hawlStartDate);
  const due = new Date(start);
  due.setDate(due.getDate() + LUNAR_YEAR_DAYS);
  return due;
}

export function zakatAmount(asset: ZakatAsset): number {
  if (!asset.zakatEligible) return 0;
  if (asset.currentValue < asset.nisabThreshold) return 0;
  return Math.round(asset.currentValue * 0.025 * 100) / 100;
}

export function goalSaved(goal: Goal, transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.linkedGoalId === goal.id && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function goalRequiredMonthly(goal: Goal, saved: number): number {
  const remaining = goal.targetAmount - saved;
  if (remaining <= 0) return 0;
  const now = new Date();
  const deadline = new Date(goal.deadline);
  const months = Math.max(
    1,
    (deadline.getFullYear() - now.getFullYear()) * 12 +
      (deadline.getMonth() - now.getMonth())
  );
  return Math.round((remaining / months) * 100) / 100;
}

export function debtPaid(debt: Debt, transactions: Transaction[]): number {
  return transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.category === 'Debt payment' &&
        t.notes?.toLowerCase().includes(debt.lender.toLowerCase())
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function monthlyNet(transactions: Transaction[]): {
  income: number;
  expense: number;
  net: number;
} {
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const income = thisMonth
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense };
}

export function sadaqahTotal(
  transactions: Transaction[],
  range: 'month' | 'year'
): number {
  const now = new Date();
  return transactions
    .filter((t) => t.subTag === 'Sadaqah')
    .filter((t) => {
      const d = new Date(t.date);
      if (range === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      return d.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + t.amount, 0);
}
