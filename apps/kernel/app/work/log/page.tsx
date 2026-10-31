'use client';

import LogForm from '@/components/work/LogForm';
import { todayPKT } from '@/lib/work/date';

export default function WorkLogPage() {
  const today = todayPKT();
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-zinc-500">
          {new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', {
            timeZone: 'UTC',
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          })}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-100">Log today</h2>
      </header>
      <LogForm />
    </div>
  );
}
