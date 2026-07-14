# Self-Khilafah v2

Life governance kernel. Receives daily reports from your 6 province apps, computes a
weighted life score, and tracks character, weekly review, and hadith study.

## Stack

- Next.js 14 (App Router) + Drizzle ORM + Neon serverless Postgres
- Tailwind (zinc-950 dark theme, brand green accent)
- recharts, lucide-react
- PWA via next-pwa (installable, offline fallback)
- No auth — this is a personal, single-user app

## Setup

```bash
pnpm install
cp .env.example .env.local
# edit .env.local and set DATABASE_URL to your Neon connection string
cp .env.local .env
pnpm db:push
pnpm dev
```

Open http://localhost:3000

## Registering your 6 provinces

Go to `/provinces` in the app and click **New** for each province:

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

After registering, you'll see the generated `X-Api-Key` and `Pull Secret` **once** —
copy them into that province app's environment variables immediately:

- The province app should send `X-Api-Key: {rawApiKey}` when it `POST`s to
  `/api/provinces/report` on this app.
- This app sends `Authorization: Bearer {pullSecret}` when it pulls from
  `{province.url}/api/report` — your province app should verify that secret.

Alternatively, run the seed script against a running instance to register all 6 at once
(update the two placeholder URLs first):

```bash
BASE_URL=http://localhost:3000 npx tsx scripts/seed-provinces.ts
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add `DATABASE_URL` (and optionally `CRON_SECRET`) as environment variables.
4. Vercel will pick up `vercel.json`'s daily cron
   (`0 0 * * *` UTC) hitting `/api/cron/pull-provinces`.
5. If you set `CRON_SECRET`, Vercel automatically sends it as
   `Authorization: Bearer {CRON_SECRET}` — the route checks this.

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
  api/provinces/       — report (push), register, [slug] (patch/delete), list
  api/life-score/      — current score + 12-week history
  api/character/       — weekly virtue ratings
  api/review/          — weekly review
  api/hadith/          — weekly hadith log
  api/cron/            — daily pull job
components/           — Sidebar, BottomNav, ScoreRing, ProvinceCard
db/                    — Drizzle schema + connection
lib/                   — time (PKT), auth (bcrypt), life-score formula, shared types
scripts/               — seed-provinces.ts
```
