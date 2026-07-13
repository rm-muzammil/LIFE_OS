# Self-Khilafah — Collective Fixes: what's in this package

## New / rewritten files (drop in as-is)
- `app/page.tsx` — dashboard, rewritten per Fix 1
- `components/ProvinceScoreStrip.tsx` — new, replaces `FaithScoreBanner.tsx` (Fix 2)
- `components/LifeScoreRing.tsx` — new, weighted total ring (Fix 1)
- `app/api/life-score/route.ts` — rewritten per Fix 3
- `components/GitHubBoxes.tsx` — rewritten per Fix 4
- `app/api/provinces/faith-history/route.ts` — new per Fix 4
- `app/api/github-boxes/route.ts` — new per Fix 7 (net effect of delete-then-recreate in Fix 5/Fix 7)
- `app/ibadah/page.tsx`, `app/quran/page.tsx` — redirects per Fix 5
- `components/Sidebar.tsx`, `components/MobileNav.tsx` — rewritten per Fix 6

## Manual patches (can't safely auto-generate — see patches/)
- `patches/1-schema-addition.md` — add `provinceDailySnapshots` (and `lifeScoreHistory` if it doesn't already exist) to `db/schema/index.ts`, then run your migration.
- `patches/2-report-route-snapshot-hook.md` — add a snapshot write to the end of `app/api/provinces/report/route.ts`. This route was on your "don't touch" list, but Fix 7 requires this specific addition — flagging it rather than silently editing a file I've never seen.

## Delete these (Fix 5)
```
app/ibadah/               → replaced with redirect page above, delete the rest of the old route's files
app/quran/                → same
app/api/ibadah/
app/api/daily-score/
app/api/faith-score/
app/api/streak/
app/api/raku/
app/api/vocab/
app/api/memorization/
app/api/impact/
components/FaithScoreBanner.tsx   → replaced by ProvinceScoreStrip.tsx
```
(`app/api/github-boxes/` is NOT deleted — it's replaced in place, see above.)

## Untouched, per your rules
`db/schema/index.ts` (aside from the addition), `app/api/provinces/report|register|[slug]`,
`app/settings/page.tsx`, `app/character/`, `app/api/character/`, `app/review/page.tsx`,
`app/api/review/`, `components/WeeklyGraphs.tsx`, all PWA files.

## Assumptions worth double-checking against your real schema
- `provinces` table has `slug, name, cachedScore, cachedDetails, cachedAt, weight, active, url`.
- `characterRatings` has numeric rating columns + `createdAt`.
- `weeklyReview` has `missionAlignScore` (assumed 0–10 scale) + `createdAt`.
- Province apps push a `streak` field inside `cachedDetails`.
- Faith Tracker optionally exposes `GET /api/activity` returning `{ days: [{date, salah, rakuDone, verseDone, dhikrDone}] }` for live history pull; falls back to local snapshots if absent/unreachable.

If any of these don't match your actual schema, the field names are the only
thing that needs adjusting — the logic/shape described in your spec is intact.
