'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const load = useCallback(async () => {
    try {
      const [pRes, lsRes] = await Promise.all([
        fetch('/api/provinces', { cache: 'no-store' }),
        fetch('/api/life-score', { cache: 'no-store' }),
      ]);
      const pData = await pRes.json();
      const lsData = await lsRes.json();
      setProvinces(pData.provinces ?? []);
      setLifeScore(lsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    load();

    // Refetch when tab regains focus — catches pushes from province apps
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

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
  <div key={d.slug} className="flex items-center gap-2">
    <span className="text-xs text-zinc-500 w-24 shrink-0">{d.name}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${d.score ?? 0}%` }}
                />
              </div>
                <span className="text-xs text-zinc-400 w-8 text-right">{Math.round(d.score ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-32 animate-pulse bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {provinces.map((p) => (
            <ProvinceCard key={p.id} province={p} />
          ))}
        </div>
      )}
    </div>
  );
}