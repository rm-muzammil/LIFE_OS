# Patch: db/schema/index.ts

I don't have your current schema file, so rather than guess and risk clobbering
the working `provinces` table definition, add this block to the end of
`db/schema/index.ts` (imports go at the top, merge with your existing
drizzle-orm import line):

```ts
import { pgTable, serial, text, real, jsonb, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core'

export const provinceDailySnapshots = pgTable('province_daily_snapshots', {
  id:        serial('id').primaryKey(),
  date:      date('date').notNull(),
  slug:      text('slug').notNull(),
  score:     real('score').notNull(),
  details:   jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueIdx: uniqueIndex('snapshot_date_slug_idx').on(t.date, t.slug),
}))
```

Also referenced by the new `/api/life-score` route: a `lifeScoreHistory` table
with at least `(date, slug, score)` columns and a unique constraint on
`(date, slug)`, used for carry-forward when a province's `cachedScore` is
null. If you already have this table under a different name, update the
import in `app/api/life-score/route.ts` accordingly. If it doesn't exist yet,
add it alongside the block above:

```ts
export const lifeScoreHistory = pgTable('life_score_history', {
  id:    serial('id').primaryKey(),
  date:  date('date').notNull(),
  slug:  text('slug').notNull(),
  score: real('score').notNull(),
}, (t) => ({
  uniqueIdx: uniqueIndex('life_score_history_date_slug_idx').on(t.date, t.slug),
}))
```

After adding, run your usual migration step (e.g. `pnpm drizzle-kit generate`
+ `pnpm drizzle-kit push`, or whatever your project uses) — I can't run this
for you since it needs your Neon connection.
