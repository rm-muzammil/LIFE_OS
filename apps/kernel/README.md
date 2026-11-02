# Self-Khilafah Kernel

Life governance kernel. Combines scores from internal provinces into a weighted life
score, and tracks character, weekly review, and hadith study.

## Stack

- Next.js 14 (App Router) + Drizzle ORM + Neon serverless Postgres
- Tailwind (zinc-950 dark theme, brand green accent)
- recharts, lucide-react
- PWA via next-pwa (installable, offline fallback)
- Google OAuth (next-auth v4), with per-user data scoped by `userId`

## Setup

```bash
pnpm install
cp .env.example .env.local
# Set DATABASE_URL and follow "Google OAuth setup" below.
cp .env.local .env
pnpm db:push
pnpm dev
```

Open http://localhost:3000 and sign in with Google.

## Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a project and enable the Google People API.
3. Configure the OAuth consent screen and add test users, or publish it.
4. Create an OAuth 2.0 Client ID for a web application.
5. Add these authorized redirect URIs:
   ```
   https://self-khilafah.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
7. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

Each user can configure Gemini API keys on the Settings page. If none are set, the
app falls back to `GEMINI_API_KEY_1/2/3`.

## Internal provinces

The six provinces (Faith, Personal, Wealth, Roadmap, Relationships, Work) are
auto-registered on first sign-in by `lib/default-provinces.ts`. Each is an internal
Kernel module with a score function registered in `lib/internal-provinces.ts`.

| Name          | Slug            | Path             | Weight |
|---------------|-----------------|------------------|--------|
| Faith         | faith           | `/faith`         | 0.25   |
| Personal      | personal        | `/personal`      | 0.20   |
| Wealth        | wealth          | `/wealth`        | 0.15   |
| Roadmap       | roadmap         | `/roadmap`       | 0.15   |
| Relationships | relationships   | `/relationships` | 0.10   |
| Work          | work            | `/work`          | 0.10   |

Province scores refresh through the internal registry on the scheduled refresh and
when module mutations request a refresh. Existing province URLs can be converted to
Kernel paths using `scripts/internalize-province.ts`.

### How to add a new internal province

1. Add the module's user-scoped tables to the database schema and its migration.
2. Implement a score function returning the existing `ProvinceReportPayload` envelope
   (without `userId`).
3. Register the scorer in `lib/internal-provinces.ts`.
4. Add its internal path and weight to `lib/default-provinces.ts`.
5. Call `refreshInternalProvince` from the module's mutating routes.

Rows with an unregistered slug are skipped by the scheduled refresh and logged by
slug. Existing custom rows are not deleted automatically; deactivate or delete them
from `/provinces` if they should no longer contribute to Life Score.

The "Reset to defaults" button on `/provinces` deletes every province row for the
user (including custom rows) and recreates the six defaults. Historical snapshots for
the default slugs remain available.

## Wealth module migration

The Wealth module uses per-user `wealth_*` tables and `getApiUserId()`-scoped API
routes. The schema source is `packages/db/src/schema.ts`.

To copy the standalone Wealth database, set `WEALTH_DATABASE_URL` and `DATABASE_URL`.
The importer is idempotent and does not delete source or target rows. Dry-run first;
if legacy tables have no `user_id`, pass the account's Google `sub` when applying:

```bash
cd apps/kernel
pnpm dlx tsx --tsconfig tsconfig.json scripts/migrate-wealth-data.ts --dry-run
pnpm dlx tsx --tsconfig tsconfig.json scripts/migrate-wealth-data.ts --apply --user-id <google-sub>
```

If every legacy table already has `user_id` (or `userId`), the importer preserves
those values and ignores `--user-id`.

## Deploying to Vercel

Set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `SCHEDULER_API_SECRET`. `CRON_SECRET` is optional and
protects the scheduled refresh and schedule-generation endpoints. The Gemini
fallback keys are optional when users configure their own keys.

Vercel schedules the internal province refresh at 18:00 UTC and schedule generation
at 19:00 UTC, with a 20:00 UTC retry. The scheduler checks cached province data and
can invoke the refresh endpoint itself if registered provinces are stale. Set
`SCHEDULER_API_SECRET` for the cron route's server-to-server schedule-generation
request; the manual Regenerate action uses the signed-in session.

## Life score formula

```text
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

Daily snapshots, ISO week keys, and "today" on the dashboard use `Asia/Karachi`
(PKT), never the server's local timezone.

## Project structure

```text
app/                  — pages + API routes (App Router)
  api/provinces/      — list, per-slug patch/delete, reset
  api/cron/           — internal province refresh and schedule-generation jobs
components/           — Sidebar, BottomNav, SessionProvider, ScoreRing, ProvinceCard
db/                   — Drizzle schema + connection
lib/                  — auth, internal province registry, scheduler, time, shared types
scripts/              — internalize-province.ts and module data importers
```

## Multi-user notes

- User data is scoped by `user_id`, the Google account's `sub`; next-auth uses JWT
  sessions without a database adapter.
- `lib/auth.ts` provides `getUserId()`/`requireAuth()` for pages and
  `getApiUserId()` for API routes.
- Province rows are provisioned on first sign-in. Existing custom province rows can
  be deactivated or deleted from `/provinces`; resetting replaces all rows with the
  six defaults.
