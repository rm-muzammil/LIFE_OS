# Faith Tracker

Personal daily faith accountability app. PWA. Mobile-first. No auth.

## Stack
- **Next.js 14** (App Router)
- **Drizzle ORM** + **Neon** (serverless Postgres)
- **Tailwind CSS** — zinc-950 dark theme, brand green
- **Amiri** font for Arabic text
- **next-pwa** — offline-capable PWA
- **Zustand** — client state

## Scoring (max 105 → normalised 100)
| Section | Max |
|---|---|
| Salah (5×8 + on-time) | 50 |
| Dhikr | 25 |
| Quran Learning | 15 |
| Sunnah Recitations | 10 |
| Self-Discipline | 5 |

Friday Al-Kahf bonus: +5 (hard-capped at 100)

## Setup

```bash
cp .env.local.example .env.local
# Fill DATABASE_URL with your Neon connection string
npm install
npm run db:push      # push schema to Neon
npm run dev
```

## Deploy (Vercel)
1. Create new Vercel project → import this repo
2. Add `DATABASE_URL` env var (Neon connection string)
3. Deploy

## After deploy
1. Open `/settings`
2. Set Self-Khilafah URL + API key
3. Test push to verify province reporting

## DB commands
```bash
npm run db:push      # sync schema
npm run db:studio    # Drizzle Studio GUI
npm run db:generate  # generate migration files
```

## PWA icons
```bash
node scripts/gen-icons.js
# Then convert the SVGs to PNGs at icons/icon-192.png and icon-512.png
```
