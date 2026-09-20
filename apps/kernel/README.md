# Self-Khilafah v2

Life governance kernel. Receives daily reports from your 6 province apps, computes a
weighted life score, and tracks character, weekly review, and hadith study.

## Stack

- Next.js 14 (App Router) + Drizzle ORM + Neon serverless Postgres
- Tailwind (zinc-950 dark theme, brand green accent)
- recharts, lucide-react
- PWA via next-pwa (installable, offline fallback)
- Google OAuth (next-auth v4) — multi-user, open sign-up, all data scoped by userId

## Setup

```bash
pnpm install
cp .env.example .env.local
# edit .env.local: set DATABASE_URL, then follow "Google OAuth setup" below
# for NEXTAUTH_URL / NEXTAUTH_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
cp .env.local .env
pnpm db:push
pnpm dev
```

Open http://localhost:3000 — you'll be redirected to sign in with Google first.

## Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project → enable the **Google+ API** (or "People API" if that's what's offered).
3. **OAuth consent screen** → External → add your email as a test user (or publish it —
   sign-up is open to any Google account, there's no allowlist).
4. **Credentials** → Create Credentials → **OAuth 2.0 Client ID** → Web application.
5. Authorized redirect URIs:
   ```
   https://self-khilafah.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
6. Copy the Client ID + Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
7. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

Each user manages their own Gemini API keys on the **Settings** page — if they leave
those blank, generation falls back to the shared `GEMINI_API_KEY_1/2/3` env vars.

## Provinces: shared key architecture

Provinces are now **auto-registered on first sign-in** — the 6 defaults (Faith,
Personal, Wealth, Roadmap, Relationships, Work) are created automatically the first
time someone signs in with Google (see `lib/default-provinces.ts` and the `signIn`
callback in `lib/auth-options.ts`). No manual registration step, no per-user API keys.

| Name          | Slug            | URL                                            | Weight |
|---------------|-----------------|-------------------------------------------------|--------|
| Faith         | faith           | https://faithtracker.vercel.app                 | 0.25   |
| Personal      | personal        | https://personal-blush-zeta.vercel.app          | 0.20   |
| Wealth        | wealth          | https://wealth-app-eta.vercel.app               | 0.15   |
| Roadmap       | roadmap         | https://life-os-chi-ecru.vercel.app             | 0.15   |
| Relationships | relationships   | https://your-relationships-app.vercel.app       | 0.10   |
| Work          | work            | https://work-app-azure.vercel.app               | 0.10   |

Update the URLs in `lib/default-provinces.ts` to match your actual deployed province
apps before anyone signs in — those are baked in at provisioning time, though you can
always edit a province's URL later directly in the database (there's no UI for it
currently, since the `/provinces` page treats the URL as read-only).

**Push (province → SK):** every province app now shares **one** API key —
`PROVINCE_SHARED_API_KEY` — instead of a unique key per user. A province app
identifies whose data it's pushing via a `userId` field in the request body:

```json
POST /api/provinces/report
X-Api-Key: {PROVINCE_SHARED_API_KEY}
{
  "userId": "<the Self-Khilafah user's Google sub>",
  "score": 82,
  "label": "Faith",
  "streak": 4,
  "todayDone": true,
  "updatedAt": "2026-09-18T12:00:00Z"
}
```

**Pull (SK → province):** unchanged in mechanism, but now also sends `X-User-Id` so a
single province app deployment can serve multiple people:

```
GET {province.url}/api/report
Authorization: Bearer {province.pullSecret}   — still unique per user
X-User-Id: {userId}
```

**Security tradeoff worth knowing:** because the push side now uses one shared secret
across every user and every province, `userId` in the push body is trusted at face
value — there's no per-request proof that the caller actually owns that user. A
province app (or anyone who obtains `PROVINCE_SHARED_API_KEY`) could push fabricated
data for a `userId` it can guess. The blast radius is limited by two things: the key
never leaves your own province apps' env vars, and a push only succeeds if the
`(userId, slug)` pair already exists as a province — so an attacker also needs a valid
Google account ID for a real user of this deployment. For a small group of friends
running their own province apps, this is a reasonable tradeoff for not managing 6+
per-user keys; it would need per-user keys again (the previous architecture) if this
ever opened up beyond people you trust.

**Adding a custom province beyond the 6 defaults:** `POST /api/provinces/register`
still exists and still works (session-based) — it creates a province row with an
unused, vestigial bcrypt `apiKeyHash` (the report route no longer checks it at all,
only the shared key), so it's really just a way to add an extra province slug/URL/weight
to your account. `scripts/seed-provinces.ts` is now redundant for the default 6 (they're
auto-created) but still works for bulk-registering custom ones if you script around it.

**Resetting to defaults:** the "Reset to defaults" button on `/provinces` deletes every
province you currently have (including custom ones) and recreates the 6 defaults fresh
— see `lib/default-provinces.ts:resetToDefaultProvinces` for exactly what happens to
your existing life-score history when you do this.

**Migrating province apps that already had a unique key:** if you deployed this before
the shared-key change, each of your province apps is currently configured with its own
per-user `X-Api-Key`. Those stop working the moment this update ships — update every
province app's env var to the new single `PROVINCE_SHARED_API_KEY`, and add your Google
`sub` as a `userId` field in whatever request body it sends to `/api/provinces/report`.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add environment variables: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SCHEDULER_API_SECRET`,
   `PROVINCE_SHARED_API_KEY`, and optionally `CRON_SECRET` and shared-fallback
   `GEMINI_API_KEY_1/2/3`.
4. Vercel will pick up `vercel.json`'s crons: a daily pull at 18:00 UTC
   (`/api/cron/pull-provinces`), then schedule generation at 19:00 UTC with a
   20:00 UTC retry (`/api/cron/generate-schedule`, twice) — the retry is a no-op
   for anyone whose 19:00 run already succeeded. Both routes now loop across
   every registered user automatically.
5. If you set `CRON_SECRET`, Vercel automatically sends it as
   `Authorization: Bearer {CRON_SECRET}` — both cron routes check this.
6. **`SCHEDULER_API_SECRET` is required** for `/api/cron/generate-schedule` to
   actually generate schedules — that route calls `/api/scheduler/generate`
   server-to-server (no session available) once per user, and that inner call is
   gated on this secret. Without it, cron-triggered generation returns 401; the
   manual "Regenerate" button on `/schedule` is unaffected since it uses the
   browser session instead.

## Life score formula

```
characterScore = avg(patience, discipline, gratitude, humility, truthfulness) / 5 * 100
missionScore    = (missionAlignScore - 1) / 4 * 100

totalWeight = sum(active province weights) + 0.03 (character) + 0.02 (mission)
lifeScore = (
  sum(province.cachedScore * province.weight) +
  characterScore * 0.03 +
  missionScore * 0.02
) / totalWeight
```

## Timezone

Everything (daily snapshots, ISO week keys, "today" on the dashboard) is computed
in `Asia/Karachi` (PKT), never the server's local timezone.

## Project structure

```
app/                  — pages + API routes (App Router)
  auth/signin/         — Google sign-in page
  api/auth/            — next-auth route ([...nextauth])
  api/provinces/       — report (push), register, [slug] (patch/delete), list
  api/life-score/      — current score + 12-week history
  api/character/       — weekly virtue ratings
  api/review/          — weekly review
  api/hadith/          — weekly hadith log
  api/user-settings/   — per-user Gemini key management (Settings page)
  api/cron/            — daily pull + schedule-generation jobs (loop every user)
components/           — Sidebar, BottomNav, SessionProvider, ScoreRing, ProvinceCard
db/                    — Drizzle schema + connection
lib/                   — time (PKT), auth (bcrypt + session helpers), gemini, life-score, shared types
middleware.ts          — redirects signed-out visitors to /auth/signin
scripts/               — seed-provinces.ts
```

## Multi-user notes

- Every table is scoped by a `user_id` text column (the Google account's `sub`
  claim) — there's no separate `users` table since next-auth runs JWT-only
  (no DB adapter). A user "exists" the moment they sign in; their data starts
  accumulating once they register a province, generate a schedule, etc.
- `lib/auth.ts` has two auth helpers: `getUserId()`/`requireAuth()` for Server
  Components/pages (redirects to `/auth/signin`), and `getApiUserId()` for API
  routes (returns `null` so the route can send a proper 401 JSON response).
  The pre-existing `hashApiKey`/`verifyApiKey`/`generateRawKey`/`generatePullSecret`
  helpers in that file are unrelated — they authenticate province push requests,
  not signed-in users — and were left untouched.
- Since this was a fresh multi-user rollout with no prior users, `pnpm db:push`
  just adds the new `user_id` columns and unique indexes directly — there's no
  data to migrate. If you *do* have pre-existing single-user rows, either clear
  those tables before pushing, or backfill `user_id` to your own Google `sub`
  afterward.
