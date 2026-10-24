import type { Debt, Goal, Transaction, ZakatAsset, WealthReport } from '@/lib/wealth/types';
import { zakatAmount, zakatDueDate } from '@/lib/wealth/calc';
import { todayISO } from '@/lib/wealth/time';

function inThisMonth(dateISO: string): boolean {
  const d = new Date(dateISO);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isToday(dateISO: string): boolean {
  return (
    new Date(dateISO).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Karachi',
    }) === todayISO()
  );
}

export function computeStreak(transactions: Transaction[]): number {
  const days = new Set(
    transactions.map((t) =>
      new Date(t.date).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Karachi',
      })
    )
  );
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const iso = cursor.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Karachi',
    });
    if (days.has(iso)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function computeReport(
  transactions: Transaction[],
  assets: ZakatAsset[],
  goals: Goal[],
  debts: Debt[]
): WealthReport {
  const monthTx = transactions.filter((t) => inThisMonth(t.date));
  const monthlyIncome = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? monthlyNet / monthlyIncome : 0;

  const sadaqahMonth = monthTx
    .filter((t) => t.subTag === 'Sadaqah')
    .reduce((s, t) => s + t.amount, 0);

  const zakatDue = assets.reduce((s, a) => s + (a.paid ? 0 : zakatAmount(a)), 0);
  const zakatOverdue = assets.some(
    (a) => !a.paid && a.zakatEligible && zakatDueDate(a.hawlStartDate) < new Date()
  );

  const activeGoals = goals.filter((g) => g.status === 'Active');
  const totalDebt = debts.reduce((s, d) => s + d.totalAmount, 0);

  const monthIncomeTx = monthTx.filter((t) => t.type === 'income');
  const halalCompliant =
    monthIncomeTx.length === 0 || monthIncomeTx.every((t) => t.halalVerified);

  const expenseToday = transactions.some(
    (t) => t.type === 'expense' && isToday(t.date)
  );

  let score = 0;
  if (monthlyIncome > 0) score += 20;
  if (expenseToday) score += 20;
  if (savingsRate >= 0.2) score += 20;
  if (halalCompliant) score += 20;
  if (!zakatOverdue) score += 10;
  if (activeGoals.length > 0) score += 10;

  return {
    score,
    label: 'Wealth',
    streak: computeStreak(transactions),
    todayDone: expenseToday,
    updatedAt: new Date().toISOString(),
    details: {
      monthlyNet,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      zakatDue,
      activeGoals: activeGoals.length,
      totalDebt,
      sadaqahMonth,
      halalCompliant,
    },
  };
}
