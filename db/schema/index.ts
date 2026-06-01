// db/schema/index.ts
import { pgTable, serial, date, boolean, integer, text, timestamp, smallint } from 'drizzle-orm/pg-core'

// ── Daily ibadah log ─────────────────────────────────────────────────────────
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
})

export type Ibadah    = typeof ibadah.$inferSelect
export type NewIbadah = typeof ibadah.$inferInsert

// ── Phase 3: Character ratings ────────────────────────────────────────────────
// One row per ISO week. isoWeek format: "2025-W23"
export const characterRatings = pgTable('character_ratings', {
  id:           serial('id').primaryKey(),
  isoWeek:      text('iso_week').notNull().unique(),
  patience:     smallint('patience').notNull(),   // 1–5
  discipline:   smallint('discipline').notNull(),
  gratitude:    smallint('gratitude').notNull(),
  humility:     smallint('humility').notNull(),
  truthfulness: smallint('truthfulness').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

export type CharacterRating    = typeof characterRatings.$inferSelect
export type NewCharacterRating = typeof characterRatings.$inferInsert

// ── Phase 3: Weekly review ─────────────────────────────────────────────────
// One row per ISO week.
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

export * from "./quran"