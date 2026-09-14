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
export const provinces = pgTable('provinces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
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
});

// 2. province_daily_snapshots — enables activity grid history
export const provinceDailySnapshots = pgTable(
  'province_daily_snapshots',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    slug: text('slug').notNull(),
    score: real('score').notNull(),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dateSlugUnique: unique().on(table.date, table.slug),
  })
);

// 3. character_ratings — weekly internal
export const characterRatings = pgTable('character_ratings', {
  id: serial('id').primaryKey(),
  isoWeek: text('iso_week').notNull().unique(), // "2026-W28"
  patience: smallint('patience').notNull(), // 1-5
  discipline: smallint('discipline').notNull(),
  gratitude: smallint('gratitude').notNull(),
  humility: smallint('humility').notNull(),
  truthfulness: smallint('truthfulness').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 4. weekly_review — weekly internal
export const weeklyReview = pgTable('weekly_review', {
  id: serial('id').primaryKey(),
  isoWeek: text('iso_week').notNull().unique(),
  wentWell: text('went_well').notNull().default(''),
  wentWrong: text('went_wrong').notNull().default(''),
  distractions: text('distractions').notNull().default(''),
  mustImprove: text('must_improve').notNull().default(''),
  intentions: text('intentions').notNull().default(''),
  missionAlignScore: smallint('mission_align_score'), // 1-5
  missionAlignNote: text('mission_align_note').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 5. hadith_log — weekly one hadith
export const hadithLog = pgTable('hadith_log', {
  id: serial('id').primaryKey(),
  isoWeek: text('iso_week').notNull().unique(),
  arabicText: text('arabic_text').notNull().default(''),
  translation: text('translation').notNull().default(''),
  source: text('source').notNull().default(''), // e.g. "Sahih Muslim 1234"
  reflection: text('reflection').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
