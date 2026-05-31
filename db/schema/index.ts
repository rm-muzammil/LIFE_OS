// db/schema/index.ts
import { pgTable, serial, date, boolean, integer, text, timestamp } from 'drizzle-orm/pg-core'

// ── Daily ibadah log ─────────────────────────────────────────────────────────
// One row per day. user_id hardcoded to 1 (no auth, personal app).
export const ibadah = pgTable('ibadah', {
  id:              serial('id').primaryKey(),
  date:            date('date').notNull().unique(),       // YYYY-MM-DD

  // Salah — 5 prayers
  fajr:            boolean('fajr').default(false).notNull(),
  dhuhr:           boolean('dhuhr').default(false).notNull(),
  asr:             boolean('asr').default(false).notNull(),
  maghrib:         boolean('maghrib').default(false).notNull(),
  isha:            boolean('isha').default(false).notNull(),

  // Quran
  quranPages:      integer('quran_pages').default(0).notNull(),

  // Dhikr
  dhikrDone:       boolean('dhikr_done').default(false).notNull(),

  // Sunnah recitations
  surahMulk:       boolean('surah_mulk').default(false).notNull(),  // nightly
  surahKahf:       boolean('surah_kahf').default(false).notNull(),  // Friday only

  // Reflection — one honest line
  reflection:      text('reflection').default('').notNull(),

  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
})

export type Ibadah    = typeof ibadah.$inferSelect
export type NewIbadah = typeof ibadah.$inferInsert
export * from "./quran"
