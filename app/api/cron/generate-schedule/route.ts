import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Thin wrapper: Vercel cron hits this GET endpoint, which internally calls
// the same generation logic as the manual "Regenerate" button (POST
// /api/scheduler/generate). Kept as a separate route so CRON_SECRET and
// SCHEDULER_API_SECRET stay independent — cron uses CRON_SECRET like the
// existing pull-provinces cron does.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/scheduler/generate`, {
    method: 'POST',
    headers: process.env.SCHEDULER_API_SECRET
      ? { Authorization: `Bearer ${process.env.SCHEDULER_API_SECRET}` }
      : {},
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ ranAt: new Date().toISOString(), forwardedStatus: res.status, ...data });
}
