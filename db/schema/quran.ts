// db/schema/quran.ts
// Phase 2 — Quran & Arabic module tables
// Add these exports to db/schema/index.ts

import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  smallint,
} from "drizzle-orm/pg-core";

// ─── 1. Raku Tracker ──────────────────────────────────────────────────────────
// Stores one row per completed raku. Current raku = max(rakuNum) + 1 if fully done.
export const rakuProgress = pgTable("raku_progress", {
  id: serial("id").primaryKey(),
  rakuNum: integer("raku_num").notNull().unique(), // 1–557
  tafseerdone: boolean("tafseer_done").notNull().default(false),
  tajweedConfidence: smallint("tajweed_confidence"), // 1–5, null until set
  vocabPasted: boolean("vocab_pasted").notNull().default(false),
  completedAt: timestamp("completed_at"), // set when all 3 done
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 2. Vocab Bank ────────────────────────────────────────────────────────────
export const vocabBank = pgTable("vocab_bank", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),          // Arabic word (UTF-8)
  root: text("root"),                    // جذر (3-letter root)
  meaning: text("meaning").notNull(),
  firstSeenRaku: integer("first_seen_raku").notNull(),
  status: text("status").notNull().default("new"), // new | familiar | known
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 3. Daily Memorization ────────────────────────────────────────────────────
// Tracks which verse is assigned to which date + whether checked off
export const memorizationLog = pgTable("memorization_log", {
  id: serial("id").primaryKey(),
  logDate: date("log_date").notNull().unique(),     // one row per day
  verseIndex: integer("verse_index").notNull(),     // index into JUZ30_VERSES array
  surahNum: integer("surah_num").notNull(),
  ayahNum: integer("ayah_num").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── 4. Verses of Impact ─────────────────────────────────────────────────────
export const versesOfImpact = pgTable("verses_of_impact", {
  id: serial("id").primaryKey(),
  surahNum: integer("surah_num").notNull(),
  ayahNum: integer("ayah_num").notNull(),
  surahName: text("surah_name").notNull(),
  arabic: text("arabic").notNull(),
  translation: text("translation").notNull(),
  personalNote: text("personal_note"),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});