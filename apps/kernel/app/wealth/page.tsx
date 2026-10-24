'use client';

import { useEffect, useState } from 'react';
import { useWealthStore } from '@/lib/wealth/useStore';
import { monthlyNet, sadaqahTotal, zakatAmount } from '@/lib/wealth/calc';
import type {
  Debt,
  Goal,
  Transaction,
  WealthReport,
  ZakatAsset,
} from '@/lib/wealth/types';
import { pkr } from '@/lib/wealth/currency';
import WealthError from '@/components/wealth/WealthError';

export default function WealthDashboard() {
  const transactions = useWealthStore<Transaction>('transactions');
  const assets = useWealthStore<ZakatAsset>('zakat');
  const goals = useWealthStore<Goal>('goals');
  const debts = useWealthStore<Debt>('debts');
  const [report, setReport] = useState<WealthReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setReportLoading(true);
      setReportError(null);
      try {
        const response = await fetch('/api/wealth/report', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : `Request failed (${response.status})`
          );
        }
        if (active) setReport(data as WealthReport);
      } catch (err) {
        if (active) {
          setReportError(err instanceof Error ? err.message : 'Unable to load the Wealth score.');
        }
      } finally {
        if (active) setReportLoading(false);
      }
    }
    void loadReport();
    return () => {
      active = false;
    };
  }, [transactions.items, assets.items, goals.items, debts.items]);

  const net = monthlyNet(transactions.items);
  const sadaqahMonth = sadaqahTotal(transactions.items, 'month');
  const sadaqahYear = sadaqahTotal(transactions.items, 'year');
  const zakatDue = assets.items.reduce((sum, asset) => sum + (asset.paid ? 0 : zakatAmount(asset)), 0);
  const activeGoals = goals.items.filter((goal) => goal.status === 'Active');
  const totalDebt = debts.items.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const dataLoading =
    transactions.loading || assets.loading || goals.loading || debts.loading;
  const dataError =
    transactions.error || assets.error || goals.error || debts.error;

  return (
    <div className="space-y-5">
      <WealthError message={dataError} />
      <WealthError message={reportError} />
      {dataLoading && <p className="text-sm text-zinc-500">Loading Wealth overview…</p>}

      <div className="card flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-zinc-500">Wealth score</p>
          {reportLoading ? (
            <p className="mt-1 text-sm text-zinc-600">Calculating…</p>
          ) : report ? (
            <p className="mt-1 text-3xl font-semibold text-brand-300">
              {report.score}<span className="text-base text-zinc-500">/100</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Score unavailable</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Streak</p>
          <p className="mt-1 text-lg font-medium text-zinc-100">
            {report ? `${report.streak}d` : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="This month · income" value={pkr(net.income)} />
        <Metric label="This month · expenses" value={pkr(net.expense)} />
        <Metric
          label="Net this month"
          value={`${net.net >= 0 ? '+' : ''}${pkr(net.net)}`}
          valueClass={net.net >= 0 ? 'text-brand-300' : 'text-red-400'}
        />
        <Metric label="Zakat due (unpaid)" value={pkr(zakatDue)} valueClass="text-brand-300" />
        <Metric label="Sadaqah this month" value={pkr(sadaqahMonth)} />
        <Metric label="Sadaqah this year" value={pkr(sadaqahYear)} />
      </div>

      <div className="card space-y-2 p-5">
        <div className="text-sm font-medium text-zinc-200">Active goals ({activeGoals.length})</div>
        {activeGoals.length === 0 ? (
          <p className="text-sm text-zinc-500">No active goals yet.</p>
        ) : (
          activeGoals.map((goal) => (
            <p key={goal.id} className="text-sm text-zinc-300">
              {goal.name} · target {pkr(goal.targetAmount)}
            </p>
          ))
        )}
      </div>

      {totalDebt > 0 && <Metric label="Total debt outstanding" value={pkr(totalDebt)} />}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = 'text-zinc-100',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}
