# Self-Khilafah — Phase 1

Life governance dashboard. Personal app, no auth, single user.

## Stack
- Next.js 14 (App Router)
- Neon (serverless Postgres)
- Drizzle ORM
- Tailwind CSS

---

## Setup — follow in order

### 1. Install dependencies
```bash
npm install
```

### 2. Create Neon database
1. Go to https://console.neon.tech
2. Sign up / log in
3. Create a new project → name it `self-khilafah`
4. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### 3. Set environment variable
```bash
cp .env.local.example .env.local
```
Open `.env.local` and paste your Neon connection string:
```
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

### 4. Push schema to database
This creates all tables in Neon automatically:
```bash
npm run db:push
```
When prompted, type `yes` to confirm.

### 5. Run the app
```bash
npm run dev
```
Open http://localhost:3000

---

## What's built in Phase 1

| Module | Route | Status |
|---|---|---|
| Dashboard | `/` | ✅ Done |
| Daily Ibadah | `/ibadah` | ✅ Done |
| Quran & Arabic | `/quran` | 🔜 Phase 2 |
| Character | `/character` | 🔜 Phase 3 |
| Weekly Review | `/review` | 🔜 Phase 3 |
| Life Score | `/life-score` | 🔜 Phase 4 |

## Daily Ibadah tracks
- **Salah** — 5 prayers individually (Fajr, Dhuhr, Asr, Maghrib, Isha)
- **Quran pages** — with quick-set buttons (1, 2, 4, 8 pages)
- **Surah Al-Mulk** — nightly checkbox (always available)
- **Surah Al-Kahf** — Friday only (disabled other days)
- **Dhikr** — done/not done
- **Daily reflection** — one honest line, saves on blur
- **Prayer streak** — counts consecutive days with all 5 prayers

---

## Database commands
```bash
npm run db:push      # Push schema changes to Neon
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

---

## Phase 2 context (for next conversation)
Paste this at the start of the next conversation:

> Self-Khilafah is a personal Next.js 14 + Neon + Drizzle app.
> Phase 1 is done: app shell, sidebar, dashboard, daily ibadah (5 prayers,
> Quran pages, Surah Mulk nightly, Surah Kahf Fridays, dhikr, reflection, streak).
> Phase 2 needs: raku tracker (Dr Israr tafseer + tajweed + vocab bank),
> daily verse memorization (Juz 30 back to front, An-Nas → Al-Falaq → ...),
> verses of impact collection. DB is Neon, schema in db/schema/index.ts.
