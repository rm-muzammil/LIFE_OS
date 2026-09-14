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

## Registering your provinces

Go to `/provinces` in the app (once signed in) and click **New** for each province.
Provinces are scoped to your account — friends using the same deployment each
register and see only their own.

| Name          | Slug            | URL                                         | Weight |
|---------------|-----------------|----------------------------------------------|--------|
| Faith         | faith           | https://faithtracker.vercel.app              | 0.25   |
| Personal      | personal        | https://personal-app.vercel.app              | 0.20   |
| Wealth        | wealth          | https://wealth-app-eta.vercel.app            | 0.15   |
| Roadmap       | roadmap         | https://life-os-chi-ecru.vercel.app          | 0.15   |
| Relationships | relationships   | (your deployed URL)                          | 0.10   |
| Work          | work            | (your deployed URL)                          | 0.10   |

**The slug must exactly match the lowercase `label` each province sends in its push
payload** (e.g. a province pushing `"label": "Faith"` is matched against slug `faith`).
Slugs only need to be unique per-account now — two different users can each register
a province called `faith` without conflicting.

After registering, you'll see the generated `X-Api-Key` and `Pull Secret` **once** —
copy them into that province app's environment variables immediately:

- The province app should send `X-Api-Key: {rawApiKey}` when it `POST`s to
  `/api/provinces/report` on this app.
- This app sends `Authorization: Bearer {pullSecret}` when it pulls from
  `{province.url}/api/report` — your province app should verify that secret.
- `/api/provinces/report` has no session — it authenticates by API key, then reads
  which user the push belongs to off the verified province row.

Alternatively, run the seed script against a running instance to register all 6 at once
(update the two placeholder URLs first). Since registration now requires a signed-in
session, sign in in your browser first and pass your session cookie:

```bash
BASE_URL=http://localhost:3000 \
SESSION_COOKIE="next-auth.session-token=..." \
npx tsx scripts/seed-provinces.ts
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add environment variables: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SCHEDULER_API_SECRET`, and optionally
   `CRON_SECRET` and shared-fallback `GEMINI_API_KEY_1/2/3`.
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
