import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  integer,
  timestamp,
  jsonb,
  serial,
  smallint,
  date,
  unique,
  index,
  primaryKey,
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

export const wealthTransactions = pgTable(
  'wealth_transactions',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    type: text('type').notNull(),
    amount: real('amount').notNull(),
    category: text('category').notNull(),
    subTag: text('sub_tag').notNull(),
    halalVerified: boolean('halal_verified').notNull().default(false),
    recurring: boolean('recurring').notNull().default(false),
    linkedGoalId: text('linked_goal_id'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdIdx: index('wealth_transactions_user_id_idx').on(table.userId),
    userDateIdx: index('wealth_transactions_user_date_idx').on(table.userId, table.date),
  })
);

export const wealthZakatAssets = pgTable(
  'wealth_zakat_assets',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    assetName: text('asset_name').notNull(),
    currentValue: real('current_value').notNull(),
    zakatEligible: boolean('zakat_eligible').notNull().default(true),
    nisabThreshold: real('nisab_threshold').notNull().default(0),
    hawlStartDate: text('hawl_start_date').notNull(),
    paid: boolean('paid').notNull().default(false),
    paidDate: text('paid_date'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdIdx: index('wealth_zakat_assets_user_id_idx').on(table.userId),
  })
);

export const wealthGoals = pgTable(
  'wealth_goals',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    targetAmount: real('target_amount').notNull(),
    deadline: text('deadline').notNull(),
    priority: text('priority').notNull(),
    status: text('status').notNull().default('Active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdIdx: index('wealth_goals_user_id_idx').on(table.userId),
    userCreatedAtIdx: index('wealth_goals_user_created_at_idx').on(table.userId, table.createdAt),
  })
);

export const wealthDebts = pgTable(
  'wealth_debts',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    lender: text('lender').notNull(),
    totalAmount: real('total_amount').notNull(),
    payoffDeadline: text('payoff_deadline'),
    monthlyCommitment: real('monthly_commitment').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userIdIdx: index('wealth_debts_user_id_idx').on(table.userId),
    userCreatedAtIdx: index('wealth_debts_user_created_at_idx').on(table.userId, table.createdAt),
  })
);

export const wealthSettings = pgTable(
  'wealth_settings',
  {
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.key] }),
    userIdIdx: index('wealth_settings_user_id_idx').on(table.userId),
  })
);

export const personalDailyLogs = pgTable(
  'personal_daily_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    workoutDone: boolean('workout_done').default(false),
    allSetsDone: boolean('all_sets_done').default(false),
    effortRating: integer('effort_rating').default(0),
    isRestDay: boolean('is_rest_day').default(false),
    calories: integer('calories').default(0),
    protein: integer('protein').default(0),
    meals: boolean('meals').default(false),
    sleepHours: real('sleep_hours').default(0),
    productiveHours: real('productive_hours').default(0),
    socialMediaOk: boolean('social_media_ok').default(false),
    helpedSomeone: boolean('helped_someone').default(false),
    contactedParents: boolean('contacted_parents').default(false),
    familyTies: boolean('family_ties').default(false),
    charityAmount: integer('charity_amount').default(0),
    goodDeeds: integer('good_deeds').default(0),
    totalScore: integer('total_score').default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.date),
    userDateIdx: index('personal_daily_logs_user_date_idx').on(table.userId, table.date),
  })
);

export const personalWorkoutPlans = pgTable(
  'personal_workout_plans',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    weekStart: text('week_start').notNull(),
    day: text('day').notNull(),
    date: text('date').notNull(),
    plan: jsonb('plan').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.date),
    userDateIdx: index('personal_workout_plans_user_date_idx').on(table.userId, table.date),
  })
);

export const personalExerciseLogs = pgTable(
  'personal_exercise_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    exerciseName: text('exercise_name').notNull(),
    setsPlanned: integer('sets_planned').default(0),
    setsCompleted: integer('sets_completed').default(0),
    reps: text('reps').notNull().default(''),
    notes: text('notes').default(''),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateExerciseUnique: unique().on(table.userId, table.date, table.exerciseName),
    userDateIdx: index('personal_exercise_logs_user_date_idx').on(table.userId, table.date),
  })
);

export const relationshipsDailyLogs = pgTable(
  'relationships_daily_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    contactedParents: boolean('contacted_parents').notNull().default(false),
    familyTies: boolean('family_ties').notNull().default(false),
    helpedSomeone: boolean('helped_someone').notNull().default(false),
    goodDeed: boolean('good_deed').notNull().default(false),
    communityObligation: boolean('community_obligation').notNull().default(false),
    charityAmount: integer('charity_amount').notNull().default(0),
    goodDeedsCount: integer('good_deeds_count').notNull().default(0),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.date),
    userDateIdx: index('relationships_daily_logs_user_date_idx').on(table.userId, table.date),
  })
);

export const relationshipsSettings = pgTable(
  'relationships_settings',
  {
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull().default(''),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.key] }),
    userIdIdx: index('relationships_settings_user_id_idx').on(table.userId),
  })
);

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
export type WealthTransaction = typeof wealthTransactions.$inferSelect;
export type NewWealthTransaction = typeof wealthTransactions.$inferInsert;
export type WealthZakatAsset = typeof wealthZakatAssets.$inferSelect;
export type NewWealthZakatAsset = typeof wealthZakatAssets.$inferInsert;
export type WealthGoal = typeof wealthGoals.$inferSelect;
export type NewWealthGoal = typeof wealthGoals.$inferInsert;
export type WealthDebt = typeof wealthDebts.$inferSelect;
export type NewWealthDebt = typeof wealthDebts.$inferInsert;
export type WealthSetting = typeof wealthSettings.$inferSelect;
export type NewWealthSetting = typeof wealthSettings.$inferInsert;
export type PersonalDailyLog = typeof personalDailyLogs.$inferSelect;
export type NewPersonalDailyLog = typeof personalDailyLogs.$inferInsert;
export type PersonalWorkoutPlan = typeof personalWorkoutPlans.$inferSelect;
export type NewPersonalWorkoutPlan = typeof personalWorkoutPlans.$inferInsert;
export type PersonalExerciseLog = typeof personalExerciseLogs.$inferSelect;
export type NewPersonalExerciseLog = typeof personalExerciseLogs.$inferInsert;
export type RelationshipsDailyLog = typeof relationshipsDailyLogs.$inferSelect;
export type NewRelationshipsDailyLog = typeof relationshipsDailyLogs.$inferInsert;
export type RelationshipsSetting = typeof relationshipsSettings.$inferSelect;
export type NewRelationshipsSetting = typeof relationshipsSettings.$inferInsert;
