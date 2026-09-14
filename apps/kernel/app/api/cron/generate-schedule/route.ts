import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { provinces } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Thin wrapper: Vercel cron hits this GET endpoint, which internally calls
// the same generation logic as the manual "Regenerate" button (POST
// /api/scheduler/generate), once per user. Kept as a separate route so
// CRON_SECRET and SCHEDULER_API_SECRET stay independent — cron uses
// CRON_SECRET like the existing pull-provinces cron does.
//
// "All users" = every distinct userId with at least one province row, since
// a user isn't meaningfully onboarded until they've registered a province
// (there's no separate users table — next-auth runs JWT-only, no DB
// adapter). A brand-new user who has only signed in but hasn't added any
// provinces yet won't get a cron-generated schedule until they do; the
// manual "Regenerate" button on /schedule still works for them immediately
// via the session-based path.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const userRows = await db.selectDistinct({ userId: provinces.userId }).from(provinces);

  const results = await Promise.allSettled(
    userRows.map(async ({ userId }) => {
      const res = await fetch(`${origin}/api/scheduler/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SCHEDULER_API_SECRET
            ? { Authorization: `Bearer ${process.env.SCHEDULER_API_SECRET}` }
            : {}),
        },
        body: JSON.stringify({ userId }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      return { userId, forwardedStatus: res.status, ...data };
    })
  );

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { userId: userRows[i].userId, error: String(r.reason) }
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}
