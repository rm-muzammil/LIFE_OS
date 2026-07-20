# AI Scheduler + Chat — integration notes

## 1. Files in this drop (v2 — self-healing pull/generate/retry redesign)

**New in v2, on top of the original drop:**
```
lib/time.ts        — REPLACE (adds isFromToday helper — everything else unchanged)
vercel.json        — REPLACE again (pull-provinces retimed to 11 PM PKT; generate-schedule now
                      has TWO cron entries — 12 AM and 1 AM PKT — hitting the same idempotent
                      endpoint, since Hobby-tier cron only guarantees the hour, not the minute)
lib/scheduler.ts    — buildProvinceContext now computes a `stale` flag per province
lib/types.ts        — ProvinceContext gets a `stale: boolean` field
app/api/scheduler/generate/route.ts — now supports { force: true }, skips redundant work if
                      today already succeeded, and self-heals by pulling provinces inline if stale
app/schedule/page.tsx — Regenerate button now sends { force: true }
```
`app/api/cron/pull-provinces/route.ts` itself was NOT modified — only its cron *timing* changed
in `vercel.json`. See section 5b below for the full reasoning.

**Original v1 files (unchanged from before):**
```
db/schema.ts                              — REPLACE (3 tables appended: dailySchedule, chatMessages, prayerTimes)
lib/gemini.ts                              — NEW (3-key fallback Gemini 2.5 Flash client)
app/api/scheduler/today/route.ts          — NEW (GET — today's schedule, split visible/missed/upcoming/done)
app/api/scheduler/tasks/[id]/route.ts     — NEW (PATCH — mark done/missed)
app/api/chat/route.ts                     — NEW (GET/POST — chat history + send message)
app/api/chat/[id]/route.ts                — NEW (DELETE — remove a message)
app/api/prayer-times/route.ts             — NEW (GET/POST — configure prayer times)
app/api/cron/generate-schedule/route.ts   — NEW (Vercel cron entry point)
app/chat/page.tsx                         — NEW
components/TaskCard.tsx                   — NEW
components/ChatBubble.tsx                 — NEW
components/Sidebar.tsx                    — REPLACE (Schedule + Chat links added)
components/BottomNav.tsx                  — REPLACE (Schedule + Chat links added — see note below)
```
Nothing under provinces, character, review, hadith, or life-score was touched.

## 2. Drizzle migration
After dropping `db/schema.ts` in, run your usual migration flow:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```
(or `push` if that's your workflow — same as when you added the original 5 tables)

## 3. New env vars (add to Vercel + .env.local)
```
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
SCHEDULER_API_SECRET=       # optional — locks /api/scheduler/generate; leave unset to match your current no-auth pattern
```
`CRON_SECRET` — already exists, reused for `/api/cron/generate-schedule`.

## 4. Things I decided that weren't 100% spec'd
- **Missed prayers never occupy a visible slot.** They render in a permanent "Missed today" strip above the normal 3-task queue, so a missed Fajr can't block the rest of the day. Non-prayer misses still reschedule to the next 15-min slot as spec'd.
- **Cron timing**: kept your requested `0 19 * * *` (midnight PKT) for schedule generation, which runs ~5 hours before `pull-provinces` (05:00 AM PKT) refreshes province data for the new day. So the prompt's province context is effectively yesterday's numbers. If you want same-day-fresh context instead, move `pull-provinces` to something like `0 18 * * *` (11 PM PKT) — 1 hour before generation.
- **Task extraction field names** (`tafseerDone`, `verseDone`, `mulkDone`, `dhikrDone`, `islamicStudyMinutes`, `workoutDone`, `calories`, `todayTotal`, `loggedToday`, `activeGoals`, `contactedParents`, `deepWorkHours`, `tasksCompleted`, `profDevMinutes`) in `lib/scheduler.ts`'s `extractPendingTaskHints` are **best guesses** based on your spec doc — I don't have your actual province apps' `cachedDetails` shape. Check these against what each province's `/api/report` endpoint actually pushes (in `provinces.cachedDetails`) and adjust the key names in `extractPendingTaskHints` accordingly. This function only affects prompt context (what Gemini is told is "pending") — it doesn't block anything if a key is missing, it just silently won't surface that hint.
- **BottomNav now has 7 items** (was 5). It's horizontally scrollable rather than cramming everything into fixed width — worth a quick look on your actual device since I couldn't test render width.
- **No user auth** on the new routes, matching your existing `/api/provinces` pattern. `SCHEDULER_API_SECRET` is there if you want to lock down generation before your Android app starts hitting these endpoints over the public internet.

## 5. Not included — Android/Kotlin side
The spec calls for a scheduler widget (4×2), a native Schedule screen, and WorkManager notification polling in your v1 APK. I don't have your Kotlin project's structure (Compose setup, existing widget provider, notification channel setup, etc.) — send over your `app/src/main` tree (or at least one existing widget's provider + layout, and your notification/WorkManager setup) and I'll write the actual Kotlin files to match, rather than guessing at your patterns the way Android tooling really punishes.

## 5b. Self-healing cron redesign (Hobby-plan safe)

You're on Vercel Hobby, which only guarantees cron jobs fire *within* their
scheduled hour, not the exact minute — so a tightly-timed multi-step chain
(11:00 → 11:30 → 12:00 → 12:30 → 1:00 → 1:30) can fire out of order some
nights. Instead of depending on ordering, the pipeline is now self-healing:

**`vercel.json`** now has 3 cron entries:
- `pull-provinces` — `0 18 * * *` (fires within the 11 PM PKT hour) — refreshes
  `provinces.cachedDetails` from each province app.
- `generate-schedule` — `0 19 * * *` (within the 12 AM PKT hour) — builds
  today's schedule.
- `generate-schedule` again — `0 20 * * *` (within the 1 AM PKT hour) — acts
  as the "retry" you wanted, hitting the *same* endpoint.

**Why hitting the same endpoint twice is safe, not a double-run:**
`POST /api/scheduler/generate` now takes an optional `{ force: true }` body.
Cron calls never send `force`, so if the 12 AM run already succeeded, the
1 AM run sees `dailySchedule.status === 'active'` with no `generationError`
and just returns `{ skipped: true }` — it only actually regenerates if the
first attempt failed or hasn't run yet. The `/schedule` page's manual
"Regenerate" button always sends `force: true`, so it always runs regardless.

**Why province staleness self-heals instead of needing exact pull-then-generate
ordering:** `lib/scheduler.ts`'s `buildProvinceContext` now checks each
province's `cachedAt` against today's PKT calendar date (`lib/time.ts`'s new
`isFromToday`). If a province hasn't been successfully pulled *today* — because
`pull-provinces` hasn't fired yet, failed, or fired on the "wrong" side of
midnight relative to `generate-schedule` — that province's `todayDone` is
treated as `false` (unknown = assume not done) instead of silently reusing
yesterday's flags. On top of that, `POST /api/scheduler/generate` checks for
any stale province *before* building the prompt and calls `pull-provinces`
itself inline if needed. So even if both crons fire in the same minute, or
pull never ran, generation still gets fresh-as-possible data.

One side effect worth knowing: because `pull-provinces` fires at 11 PM PKT —
still "today" by PKT date — and `generate-schedule` fires right after midnight
— now "tomorrow" by PKT date — the self-heal will almost always trigger a
second pull at generation time anyway (the 11 PM cachedAt is technically
"yesterday" relative to the new date). That's intentional, not a bug: it means
generation always uses the freshest possible data, and the 11 PM cron is
really just a warm first pass / backup rather than the authoritative one.

**What I didn't change:** I didn't touch how each province computes its own
`todayDone`/score (that's roadmap's/personal's/faith's own AI-driven internal
logic) — SK only reads whatever they report. If a province's own report still
says `todayDone: true` from yesterday because *it* doesn't reset properly at
day-start, that's a bug in that province's own `/api/report`, not something
SK's staleness check can see or fix — SK only knows "did we successfully pull
*something* today," not "is what we pulled actually about today."

## 6. Testing order
1. Migrate DB, add env vars, deploy.
2. Set prayer times via `POST /api/prayer-times` (or just let defaults stand).
3. Hit `POST /api/scheduler/generate` manually (or click "Generate Now" on `/schedule`) — check `generationError` in the response if Gemini fails, so you can see the actual key/HTTP error rather than a silent empty schedule.
4. Send a message on `/chat`, confirm it round-trips.
5. Confirm `vercel.json` cron shows up in the Vercel dashboard after deploy (Cron Jobs tab).
