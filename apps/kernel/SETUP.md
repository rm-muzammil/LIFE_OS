# Scheduler and province refresh notes

## Internal province refresh

All six provinces are scored by functions registered in
`lib/internal-provinces.ts`. The Vercel cron path remains
`/api/cron/pull-provinces` for deployment compatibility, but it now refreshes
scores directly inside Kernel and makes no HTTP requests to standalone province
apps. Module mutations also refresh their province score.

The route processes each registered province independently. A row whose slug has
no scorer is skipped with a warning containing only the slug. A scorer failure is
reported for that row and does not prevent other provinces from refreshing.

The scheduler reads `provinces.cachedDetails` and checks `cachedAt` against today's
PKT date. If a registered province is stale, schedule generation invokes the refresh
route before building its prompt. If refresh fails, the scheduler continues using
the stale indicator rather than treating yesterday's `todayDone` as current.

## Cron configuration

`vercel.json` schedules:

- Internal province refresh at `0 18 * * *` (within the 11 PM PKT hour).
- Schedule generation at `0 19 * * *` (within the midnight PKT hour).
- A schedule-generation retry at `0 20 * * *` (within the 1 AM PKT hour).

Vercel Hobby guarantees the scheduled hour, not the exact minute. Schedule
generation is idempotent: a successful schedule for today is not generated again
unless the request explicitly asks to force regeneration.

Set `CRON_SECRET` to protect both cron endpoints; Vercel sends it in the
`Authorization` header. Set `SCHEDULER_API_SECRET` for the cron route's server-to-
server call to `/api/scheduler/generate`. The manual Regenerate action uses the
signed-in browser session.

## Testing order

1. Deploy and confirm the cron jobs appear in the Vercel dashboard.
2. Sign in and verify the six province paths open from `/provinces`.
3. Confirm each province has a recent cached score after the next refresh cron.
4. Generate a schedule, then confirm a second non-forced attempt is skipped after a
   successful generation.
5. Send a message on `/chat` and confirm it round-trips.
