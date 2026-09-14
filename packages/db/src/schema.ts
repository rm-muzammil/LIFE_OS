import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  timestamp,
  jsonb,
  serial,
  smallint,
  date,
  unique,
} from 'drizzle-orm/pg-core';

// 1. provinces — registry + cache
export const provinces = pgTable(
  'provinces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    url: text('url').notNull(),
    apiKeyHash: text('api_key_hash').notNull(), // bcrypt hash — verifies push
    pullSecret: text('pull_secret').notNull(), // SK sends this when pulling
    weight: real('weight').notNull().default(0),
    active: boolean('active').notNull().default(true),
    cachedScore: real('cached_score'), // last known 0-100
    cachedDetails: jsonb('cached_details'),
    cachedAt: timestamp('cached_at', { withTimezone: true }),
    lastPushedAt: timestamp('last_pushed_at', { withTimezone: true }),
    lastPulledAt: timestamp('last_pulled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSlugUnique: unique().on(table.userId, table.slug),
  })
);

// 2. province_daily_snapshots — enables activity grid history
export const provinceDailySnapshots = pgTable(
  'province_daily_snapshots',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    date: date('date').notNull(),
    slug: text('slug').notNull(),
    score: real('score').notNull(),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateSlugUnique: unique().on(table.userId, table.date, table.slug),
  })
);

// 3. character_ratings — weekly internal
export const characterRatings = pgTable(
  'character_ratings',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    isoWeek: text('iso_week').notNull(), // "2026-W28"
    patience: smallint('patience').notNull(), // 1-5
    discipline: smallint('discipline').notNull(),
    gratitude: smallint('gratitude').notNull(),
    humility: smallint('humility').notNull(),
    truthfulness: smallint('truthfulness').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWeekUnique: unique().on(table.userId, table.isoWeek),
  })
);

// 4. weekly_review — weekly internal
export const weeklyReview = pgTable(
  'weekly_review',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    isoWeek: text('iso_week').notNull(),
    wentWell: text('went_well').notNull().default(''),
    wentWrong: text('went_wrong').notNull().default(''),
    distractions: text('distractions').notNull().default(''),
    mustImprove: text('must_improve').notNull().default(''),
    intentions: text('intentions').notNull().default(''),
    missionAlignScore: smallint('mission_align_score'), // 1-5
    missionAlignNote: text('mission_align_note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWeekUnique: unique().on(table.userId, table.isoWeek),
  })
);

// 5. hadith_log — weekly one hadith
export const hadithLog = pgTable(
  'hadith_log',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    isoWeek: text('iso_week').notNull(),
    arabicText: text('arabic_text').notNull().default(''),
    translation: text('translation').notNull().default(''),
    source: text('source').notNull().default(''), // e.g. "Sahih Muslim 1234"
    reflection: text('reflection').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWeekUnique: unique().on(table.userId, table.isoWeek),
  })
);

// ─────────────────────────────────────────────────────────────
// 6. daily_schedule — AI-generated schedule, one row per PKT day
// ─────────────────────────────────────────────────────────────
export const dailySchedule = pgTable(
  'daily_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    date: date('date').notNull(), // PKT date YYYY-MM-DD
    userNotes: text('user_notes').notNull().default(''), // combined chat notes fed to AI
    tasks: jsonb('tasks').notNull(), // ScheduledTask[] — see lib/types.ts
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('active'), // 'active' | 'completed'
    generationError: text('generation_error'), // set if Gemini failed; tasks stays []
  },
  (table) => ({
    userDateUnique: unique().on(table.userId, table.date),
  })
);

// ─────────────────────────────────────────────────────────────
// 7. chat_messages — persistent chat, shared web + Android
// ─────────────────────────────────────────────────────────────
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  date: date('date').notNull(), // PKT date (for daily context grouping)
  feedsSchedule: boolean('feeds_schedule').notNull().default(true), // include in tomorrow's prompt
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// 8. prayer_times — one row per user
// ─────────────────────────────────────────────────────────────
export const prayerTimes = pgTable('prayer_times', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  fajr: text('fajr').notNull().default('05:20'),
  dhuhr: text('dhuhr').notNull().default('13:00'),
  asr: text('asr').notNull().default('16:45'),
  maghrib: text('maghrib').notNull().default('19:30'),
  isha: text('isha').notNull().default('21:00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// 9. user_settings — per-user config (Gemini keys, etc.)
// ─────────────────────────────────────────────────────────────
export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  geminiKey1: text('gemini_key_1'),
  geminiKey2: text('gemini_key_2'),
  geminiKey3: text('gemini_key_3'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Province = typeof provinces.$inferSelect;
export type NewProvince = typeof provinces.$inferInsert;
export type ProvinceDailySnapshot = typeof provinceDailySnapshots.$inferSelect;
export type CharacterRating = typeof characterRatings.$inferSelect;
export type NewCharacterRating = typeof characterRatings.$inferInsert;
export type WeeklyReview = typeof weeklyReview.$inferSelect;
export type NewWeeklyReview = typeof weeklyReview.$inferInsert;
export type HadithLog = typeof hadithLog.$inferSelect;
export type NewHadithLog = typeof hadithLog.$inferInsert;

export type DailySchedule = typeof dailySchedule.$inferSelect;
export type NewDailySchedule = typeof dailySchedule.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessageRow = typeof chatMessages.$inferInsert;
export type PrayerTimesRow = typeof prayerTimes.$inferSelect;
export type NewPrayerTimesRow = typeof prayerTimes.$inferInsert;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type NewUserSettingsRow = typeof userSettings.$inferInsert;
