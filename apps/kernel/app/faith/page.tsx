'use client';

import { useEffect, useState } from 'react';
import type { FaithDailyLog } from '@/db/schema';
import { DashboardClient } from '@/components/faith/DashboardClient';

interface DashboardData {
  existing: FaithDailyLog | null;
  activityData: { date: string; green: boolean; score: number }[];
  streak: number;
  today: string;
  hijriFormatted: string;
  hijriFormattedAr: string;
  hijriDayName: string;
  hijriSource: 'api' | 'calculated';
}

export default function FaithDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/faith/dashboard', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load Faith dashboard.');
        return (await response.json()) as DashboardData;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError('Could not load Faith dashboard. Please try again.');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p role="alert" className="py-12 text-center text-sm text-red-400">{error}</p>;
  }
  if (!data) {
    return <p role="status" className="py-12 text-center text-sm text-zinc-500">Loading Faith dashboard…</p>;
  }

  return <DashboardClient {...data} />;
}
