// db/schema/index.ts
import {
  pgTable,
  serial,
  date,
  boolean,
  integer,
  text,
  timestamp,
  smallint,
  real,
  index,
} from 'drizzle-orm/pg-core'

// ── Daily ibadah log ──────────────────────────────────────────────────────────
export const ibadah = pgTable('ibadah', {
  id:           serial('id').primaryKey(),
  date:         date('date').notNull().unique(),
  fajr:         boolean('fajr').default(false).notNull(),
  dhuhr:        boolean('dhuhr').default(false).notNull(),
  asr:          boolean('asr').default(false).notNull(),
  maghrib:      boolean('maghrib').default(false).notNull(),
  isha:         boolean('isha').default(false).notNull(),
  quranPages:   integer('quran_pages').default(0).notNull(),
  dhikrDone:    boolean('dhikr_done').default(false).notNull(),
  surahMulk:    boolean('surah_mulk').default(false).notNull(),
  surahKahf:    boolean('surah_kahf').default(false).notNull(),
  reflection:   text('reflection').default('').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  dateIdx: index('ibadah_date_idx').on(t.date),
}))

export type Ibadah    = typeof ibadah.$inferSelect
export type NewIbadah = typeof ibadah.$inferInsert

// ── Character ratings ─────────────────────────────────────────────────────────
// One row per ISO week e.g. "2025-W23"
export const characterRatings = pgTable('character_ratings', {
  id:           serial('id').primaryKey(),
  isoWeek:      text('iso_week').notNull().unique(),
  patience:     smallint('patience').notNull(),
  discipline:   smallint('discipline').notNull(),
  gratitude:    smallint('gratitude').notNull(),
  humility:     smallint('humility').notNull(),
  truthfulness: smallint('truthfulness').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

export type CharacterRating    = typeof characterRatings.$inferSelect
export type NewCharacterRating = typeof characterRatings.$inferInsert

// ── Weekly review ─────────────────────────────────────────────────────────────
export const weeklyReview = pgTable('weekly_review', {
  id:                serial('id').primaryKey(),
  isoWeek:           text('iso_week').notNull().unique(),
  wentWell:          text('went_well').notNull().default(''),
  wentWrong:         text('went_wrong').notNull().default(''),
  distractions:      text('distractions').notNull().default(''),
  mustImprove:       text('must_improve').notNull().default(''),
  intentions:        text('intentions').notNull().default(''),
  missionAlignScore: smallint('mission_align_score').notNull(),  // 1–5
  missionAlignNote:  text('mission_align_note').notNull().default(''),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
})

export type WeeklyReview    = typeof weeklyReview.$inferSelect
export type NewWeeklyReview = typeof weeklyReview.$inferInsert

// ── Life score history ────────────────────────────────────────────────────────
// Stored weekly. Faith 60%, Character 25%, Mission 15%.
// Health and Knowledge withdrawn — feeds not connected.
export const lifeScoreHistory = pgTable('life_score_history', {
  id:             serial('id').primaryKey(),
  weekStart:      date('week_start').notNull().unique(),
  faithScore:     real('faith_score').notNull(),      // 0–100, avg of week's daily scores
  characterScore: real('character_score').notNull(),  // 0–100, scaled from 1–5
  missionScore:   real('mission_score').notNull(),    // 0–100, scaled from 1–5
  totalScore:     real('total_score').notNull(),      // weighted: F60+C25+M15
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

export type LifeScoreHistory    = typeof lifeScoreHistory.$inferSelect
export type NewLifeScoreHistory = typeof lifeScoreHistory.$inferInsert

// ── External feed settings ────────────────────────────────────────────────────
// Kept for future Phase (German Roadmap + Personal App)
export const externalFeedSettings = pgTable('external_feed_settings', {
  id:               serial('id').primaryKey(),
  germanRoadmapUrl: text('german_roadmap_url'),
  personalAppUrl:   text('personal_app_url'),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
})

export type ExternalFeedSettings    = typeof externalFeedSettings.$inferSelect
export type NewExternalFeedSettings = typeof externalFeedSettings.$inferInsert


// db/schema/index.ts  — APPEND ONLY, after lifeScoreHistory and externalFeedSettings

// ── Provinces ─────────────────────────────────────────────────────────────────
// External apps that push data to SK (Faith Tracker, German Roadmap, etc.)
import { uuid, jsonb } from 'drizzle-orm/pg-core'

export const provinces = pgTable('provinces', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           text('name').notNull(),
  slug:           text('slug').notNull().unique(),
  url:            text('url').notNull(),
  apiKeyHash:     text('api_key_hash').notNull(),
  pullSecret:     text('pull_secret').notNull(),
  weight:         real('weight').notNull().default(0),
  active:         boolean('active').notNull().default(true),
  cachedScore:    real('cached_score'),
  cachedDetails:  jsonb('cached_details'),
  cachedAt:       timestamp('cached_at'),
  lastPushedAt:   timestamp('last_pushed_at'),
  lastPulledAt:   timestamp('last_pulled_at'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

export type Province    = typeof provinces.$inferSelect
export type NewProvince = typeof provinces.$inferInsert

export * from './quran'


