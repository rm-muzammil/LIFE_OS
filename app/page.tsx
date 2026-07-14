'use client';

import { useEffect, useState } from 'react';
import ScoreRing from '@/components/ScoreRing';
import ProvinceCard from '@/components/ProvinceCard';
import type { ProvinceWithMeta } from '@/lib/types';
import { formatDatePKT } from '@/lib/time';
import type { LifeScoreResult } from '@/lib/life-score';

export default function Dashboard() {
  const [provinces, setProvinces] = useState<ProvinceWithMeta[]>([]);
  const [lifeScore, setLifeScore] = useState<LifeScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setNow(new Date());
    async function load() {
      try {
        const [pRes, lsRes] = await Promise.all([
          fetch('/api/provinces',{ cache: 'no-store' }),
          fetch('/api/life-score',{ cache: 'no-store' }),
        ]);
        const pData = await pRes.json();
        const lsData = await lsRes.json();
        setProvinces(pData.provinces ?? []);
        setLifeScore(lsData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="text-sm text-zinc-500">{formatDatePKT(now)}</p>
        <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
      </header>

      <div className="card p-6 space-y-3">
        <p className="text-sm font-medium text-zinc-300">
          Build wealth → Politics → Real Khilafah.
        </p>
        <p className="text-xs text-zinc-600">Not guaranteed. Committed regardless.</p>
        <div className="pt-3 border-t border-zinc-800">
          <p className="text-right font-arabic text-2xl leading-relaxed text-zinc-200" dir="rtl">
            وَأَن لَّيْسَ لِلْإِنسَٰنِ إِلَّا مَا سَعَىٰ
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            "And that man will only have what he strived for." — An-Najm 53:39
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 card p-8">
        <ScoreRing score={lifeScore?.lifeScore ?? 0} label="Life Score" />
        <div className="flex-1 w-full space-y-2">
         {(lifeScore?.dimensions ?? []).map((d) => (
            <div key={d.slug} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-zinc-400 truncate">{d.name}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${d.score ?? 0}%` }}
                />
              </div>
              <span className="w-10 text-right text-zinc-500 tabular-nums">
                {d.score != null ? Math.round(d.score) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Provinces
        </h2>
        {loading ? (
          <p className="text-zinc-600 text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {provinces.map((p) => (
              <ProvinceCard key={p.slug} province={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
