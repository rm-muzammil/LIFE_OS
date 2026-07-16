'use client';

import { Flame, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import type { ProvinceWithMeta } from '@/lib/types';

export default function ProvinceCard({ province }: { province: ProvinceWithMeta }) {
const neverPushed = province.cachedScore == null;

  return (
    <div className="card card-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-100">{province.name}</h3>
          <p className="text-xs text-zinc-600">weight {(province.weight * 100).toFixed(0)}%</p>
        </div>
        {province.stale && !neverPushed && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-950/50 px-2 py-1 rounded-full">
            <AlertTriangle size={11} /> stale
          </span>
        )}
      </div>

      {neverPushed ? (
        <p className="text-sm text-zinc-600 italic py-2">Awaiting first push</p>
      ) : (
        <>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold tabular-nums">
              {province.cachedScore != null ? Math.round(province.cachedScore) : '—'}
            </span>
            <span className="text-sm text-zinc-600 mb-1">/100</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Flame size={13} className="text-orange-400" />
              {province.streak ?? 0} day streak
            </span>
            <span className="flex items-center gap-1">
              {province.todayDone ? (
                <CheckCircle2 size={13} className="text-brand-400" />
              ) : (
                <Circle size={13} className="text-zinc-700" />
              )}
              {province.todayDone ? 'done today' : 'not yet'}
            </span>
          </div>
          {province.lastPushedAt && (
            <p className="text-[11px] text-zinc-700">
              last push {new Date(province.lastPushedAt).toLocaleString('en-US', {
                timeZone: 'Asia/Karachi',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
