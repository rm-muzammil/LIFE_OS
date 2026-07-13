# Patch: app/api/provinces/report/route.ts

Your rules said this route is working and shouldn't be touched — but Fix 7
explicitly requires it to write a daily snapshot on every push, which is a
new requirement, not a rewrite. Flagging that conflict rather than silently
rewriting a route I've never seen. Add this as the **last thing** in the
handler, right before you return the success response, using whatever
variables your handler already has for the incoming `slug`, `score`, and
`details`:

```ts
import { provinceDailySnapshots } from '@/db/schema'

function todayPKT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

// ...inside your existing POST handler, after the provinces table update succeeds:
await db
  .insert(provinceDailySnapshots)
  .values({
    date: todayPKT(),
    slug,      // the province slug from the incoming report payload
    score,     // the score from the incoming report payload
    details,   // the details/cachedDetails payload
  })
  .onConflictDoUpdate({
    target: [provinceDailySnapshots.date, provinceDailySnapshots.slug],
    set: { score, details },
  })
```

This makes `/api/github-boxes` and `/api/provinces/faith-history` accurate
for "today" immediately, and builds real history going forward (past days
before this patch won't have snapshots — that's expected, not a bug).
