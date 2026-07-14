'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import ScoreRing from '@/components/ScoreRing';
import type { LifeScoreResult } from '@/lib/life-score';

interface HistoryPoint {
  isoWeek: string;
  score: number;
}

export default function LifeScorePage() {
  const [data, setData] = useState<LifeScoreResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [lsRes, hRes] = await Promise.all([
          fetch('/api/life-score'),
          fetch('/api/life-score/history'),
        ]);
        setData(await lsRes.json());
        const hData = await hRes.json();
        setHistory(hData.history ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const barData =
    data?.dimensions.map((d) => ({
      name: d.name,
      score: d.score ?? 0,
      contribution: Math.round(d.contribution * 100) / 100,
    })) ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Life Score</h1>
        <p className="text-sm text-zinc-500 mt-1">Weighted across all provinces + internal dimensions</p>
      </header>

      <div className="card p-8 flex justify-center">
        <ScoreRing score={data?.lifeScore ?? 0} size={220} label="Overall" />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Contribution by Dimension
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Bar dataKey="contribution" fill="#34d883" radius={[6, 6, 0, 0]} name="Contribution" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Score History (last 12 weeks)
        </h2>
        {history.length === 0 && !loading ? (
          <p className="text-sm text-zinc-600">Not enough data yet — check back after a few weeks of pushes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="isoWeek" stroke="#71717a" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
              />
              <Line type="monotone" dataKey="score" stroke="#34d883" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card p-6 overflow-x-auto">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Province Breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="py-2 pr-4">Dimension</th>
              <th className="py-2 pr-4">Weight</th>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2 pr-4">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {data?.dimensions.map((d) => (
              <tr key={d.slug} className="border-b border-zinc-900">
                <td className="py-2 pr-4">{d.name}</td>
                <td className="py-2 pr-4 text-zinc-500">{(d.weight * 100).toFixed(0)}%</td>
                <td className="py-2 pr-4 tabular-nums">{d.score != null ? Math.round(d.score) : '—'}</td>
                <td className="py-2 pr-4 tabular-nums">{d.contribution.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-b border-zinc-900">
              <td className="py-2 pr-4">Character (internal)</td>
              <td className="py-2 pr-4 text-zinc-500">3%</td>
              <td className="py-2 pr-4 tabular-nums">
                {data?.characterScore != null ? Math.round(data.characterScore) : '—'}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {data?.characterScore != null ? ((data.characterScore * 0.03).toFixed(2)) : '0.00'}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Mission (internal)</td>
              <td className="py-2 pr-4 text-zinc-500">2%</td>
              <td className="py-2 pr-4 tabular-nums">
                {data?.missionScore != null ? Math.round(data.missionScore) : '—'}
              </td>
              <td className="py-2 pr-4 tabular-nums">
                {data?.missionScore != null ? (data.missionScore * 0.02).toFixed(2) : '0.00'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
