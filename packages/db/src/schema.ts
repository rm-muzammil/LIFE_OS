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
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. provinces — registry + cache
export const provinces = pgTable(
  'provinces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    url: text('url').notNull(),
    apiKeyHash: text('api_key_hash').notNull(), // Deprecated; retained for schema compatibility.
    pullSecret: text('pull_secret').notNull(), // Deprecated; retained for schema compatibility.
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

export const workProjects = pgTable(
  'work_projects',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    targetDate: text('target_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    statusCheck: check(
      'work_projects_status_check',
      sql`${table.status} IN ('active', 'paused', 'completed')`
    ),
    userStatusCreatedAtIdx: index('work_projects_user_status_created_at_idx').on(
      table.userId,
      table.status,
      table.createdAt
    ),
  })
);

export const workDailyLogs = pgTable(
  'work_daily_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    logDate: text('log_date').notNull(),
    deepWorkHours: real('deep_work_hours').notNull().default(0),
    tasksCompleted: integer('tasks_completed').notNull().default(0),
    milestoneDone: boolean('milestone_done').notNull().default(false),
    profDevMinutes: integer('prof_dev_minutes').notNull().default(0),
    noProcrastination: boolean('no_procrastination').notNull().default(false),
    clientDeliverable: boolean('client_deliverable').notNull().default(false),
    projectId: uuid('project_id'),
    notes: text('notes'),
    score: integer('score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.logDate),
    userDateIdx: index('work_daily_logs_user_date_idx').on(table.userId, table.logDate),
    userProjectFk: foreignKey({
      name: 'work_daily_logs_user_project_fk',
      columns: [table.userId, table.projectId],
      foreignColumns: [workProjects.userId, workProjects.id],
    }),
  })
);

export const faithDailyLogs = pgTable(
  'faith_daily_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    fajr: boolean('fajr').notNull().default(false),
    dhuhr: boolean('dhuhr').notNull().default(false),
    asr: boolean('asr').notNull().default(false),
    maghrib: boolean('maghrib').notNull().default(false),
    isha: boolean('isha').notNull().default(false),
    onTime: integer('on_time').notNull().default(0),
    morningAdhkar: boolean('morning_adhkar').notNull().default(false),
    eveningAdhkar: boolean('evening_adhkar').notNull().default(false),
    beforeSleepAdhkar: boolean('before_sleep_adhkar').notNull().default(false),
    dhikrMinutes: integer('dhikr_minutes').notNull().default(0),
    duaMinutes: integer('dua_minutes').notNull().default(0),
    laIlaha: boolean('la_ilaha').notNull().default(false),
    subhanallahi: boolean('subhanallahi').notNull().default(false),
    quranPages: integer('quran_pages').notNull().default(0),
    tadabburMinutes: integer('tadabbur_minutes').notNull().default(0),
    tafseerDone: boolean('tafseer_done').notNull().default(false),
    tajweedConfidence: integer('tajweed_confidence').notNull().default(0),
    verseDone: boolean('verse_done').notNull().default(false),
    islamicStudyMinutes: integer('islamic_study_minutes').notNull().default(0),
    surahMulk: boolean('surah_mulk').notNull().default(false),
    surahKahf: boolean('surah_kahf').notNull().default(false),
    gazeLowered: integer('gaze_lowered').notNull().default(0),
    haramFree: boolean('haram_free').notNull().default(false),
    finalScore: integer('final_score').notNull().default(0),
    rawScore: real('raw_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.date),
    userDateIdx: index('faith_daily_logs_user_date_idx').on(table.userId, table.date),
  })
);

export const faithDhikrCounts = pgTable(
  'faith_dhikr_counts',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    dhikrKey: text('dhikr_key').notNull(),
    count: integer('count').notNull().default(0),
    target: integer('target').notNull().default(100),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateDhikrUnique: unique().on(table.userId, table.date, table.dhikrKey),
    userDateIdx: index('faith_dhikr_counts_user_date_idx').on(table.userId, table.date),
  })
);

export const faithMemorizationLogs = pgTable(
  'faith_memorization_logs',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    verseIndex: integer('verse_index').notNull(),
    date: text('date').notNull(),
    done: boolean('done').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userDateUnique: unique().on(table.userId, table.date),
    userDateIdx: index('faith_memorization_logs_user_date_idx').on(table.userId, table.date),
  })
);

export const faithRakuProgress = pgTable(
  'faith_raku_progress',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    rakuNumber: integer('raku_number').notNull(),
    tafseerDone: boolean('tafseer_done').notNull().default(false),
    tajweedConfidence: integer('tajweed_confidence').notNull().default(0),
    vocabExtracted: boolean('vocab_extracted').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userRakuUnique: unique().on(table.userId, table.rakuNumber),
    userIdIdx: index('faith_raku_progress_user_id_idx').on(table.userId),
  })
);

export const faithVocabBank = pgTable(
  'faith_vocab_bank',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    rakuNumber: integer('raku_number').notNull(),
    word: text('word').notNull(),
    root: text('root'),
    meaning: text('meaning').notNull(),
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userRakuIdx: index('faith_vocab_bank_user_raku_idx').on(table.userId, table.rakuNumber),
  })
);

export const faithSettings = pgTable(
  'faith_settings',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userKeyUnique: unique().on(table.userId, table.key),
    userIdIdx: index('faith_settings_user_id_idx').on(table.userId),
  })
);

export const roadmapImportBatches = pgTable(
  'roadmap_import_batches',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    filename: text('filename').notNull(),
    contentHash: text('content_hash').notNull(),
    status: text('status').notNull().default('pending'),
    rowCount: integer('row_count').notNull().default(0),
    goalCount: integer('goal_count').notNull().default(0),
    milestoneCount: integer('milestone_count').notNull().default(0),
    taskCount: integer('task_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    confirmStartedAt: timestamp('confirm_started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    statusCheck: check(
      'roadmap_import_batches_status_check',
      sql`${table.status} IN ('pending', 'done', 'failed')`
    ),
    filenameCheck: check(
      'roadmap_import_batches_filename_check',
      sql`char_length(${table.filename}) BETWEEN 1 AND 255`
    ),
    hashCheck: check(
      'roadmap_import_batches_hash_check',
      sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`
    ),
    countsCheck: check(
      'roadmap_import_batches_counts_check',
      sql`${table.rowCount} >= 0 AND ${table.goalCount} >= 0 AND ${table.milestoneCount} >= 0 AND ${table.taskCount} >= 0 AND ${table.skippedCount} >= 0 AND ${table.errorCount} >= 0`
    ),
    userCreatedIdx: index('roadmap_import_batches_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
    userHashIdx: index('roadmap_import_batches_user_hash_idx').on(
      table.userId,
      table.contentHash
    ),
  })
);

export const roadmapGoals = pgTable(
  'roadmap_goals',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    domain: text('domain').notNull().default('other'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('active'),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    source: text('source').notNull().default('manual'),
    importBatchId: uuid('import_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    titleCheck: check(
      'roadmap_goals_title_check',
      sql`char_length(${table.title}) BETWEEN 1 AND 200`
    ),
    descriptionCheck: check(
      'roadmap_goals_description_check',
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 4000`
    ),
    domainCheck: check(
      'roadmap_goals_domain_check',
      sql`${table.domain} IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')`
    ),
    priorityCheck: check(
      'roadmap_goals_priority_check',
      sql`${table.priority} IN ('low', 'medium', 'high')`
    ),
    statusCheck: check(
      'roadmap_goals_status_check',
      sql`${table.status} IN ('active', 'done', 'paused')`
    ),
    sourceCheck: check(
      'roadmap_goals_source_check',
      sql`${table.source} IN ('csv', 'ai', 'manual')`
    ),
    datesCheck: check(
      'roadmap_goals_dates_check',
      sql`(${table.startDate} IS NULL OR ${table.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') AND (${table.dueDate} IS NULL OR ${table.dueDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`
    ),
    userBatchFk: foreignKey({
      name: 'roadmap_goals_user_batch_fk',
      columns: [table.userId, table.importBatchId],
      foreignColumns: [roadmapImportBatches.userId, roadmapImportBatches.id],
    }).onDelete('cascade'),
    userStatusDueIdx: index('roadmap_goals_user_status_due_idx').on(
      table.userId,
      table.status,
      table.dueDate
    ),
  })
);

export const roadmapMilestones = pgTable(
  'roadmap_milestones',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    goalId: uuid('goal_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    domain: text('domain').notNull().default('other'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('active'),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    source: text('source').notNull().default('manual'),
    importBatchId: uuid('import_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    userGoalIdUnique: unique('roadmap_milestones_user_goal_id_unique').on(
      table.userId,
      table.goalId,
      table.id
    ),
    titleCheck: check(
      'roadmap_milestones_title_check',
      sql`char_length(${table.title}) BETWEEN 1 AND 200`
    ),
    descriptionCheck: check(
      'roadmap_milestones_description_check',
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 4000`
    ),
    domainCheck: check(
      'roadmap_milestones_domain_check',
      sql`${table.domain} IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')`
    ),
    priorityCheck: check(
      'roadmap_milestones_priority_check',
      sql`${table.priority} IN ('low', 'medium', 'high')`
    ),
    statusCheck: check(
      'roadmap_milestones_status_check',
      sql`${table.status} IN ('active', 'done', 'paused')`
    ),
    sourceCheck: check(
      'roadmap_milestones_source_check',
      sql`${table.source} IN ('csv', 'ai', 'manual')`
    ),
    datesCheck: check(
      'roadmap_milestones_dates_check',
      sql`(${table.startDate} IS NULL OR ${table.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') AND (${table.dueDate} IS NULL OR ${table.dueDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`
    ),
    userGoalFk: foreignKey({
      name: 'roadmap_milestones_user_goal_fk',
      columns: [table.userId, table.goalId],
      foreignColumns: [roadmapGoals.userId, roadmapGoals.id],
    }).onDelete('cascade'),
    userBatchFk: foreignKey({
      name: 'roadmap_milestones_user_batch_fk',
      columns: [table.userId, table.importBatchId],
      foreignColumns: [roadmapImportBatches.userId, roadmapImportBatches.id],
    }).onDelete('cascade'),
    userGoalStatusDueIdx: index('roadmap_milestones_user_goal_status_due_idx').on(
      table.userId,
      table.goalId,
      table.status,
      table.dueDate
    ),
  })
);

export const roadmapTasks = pgTable(
  'roadmap_tasks',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('user_id').notNull(),
    goalId: uuid('goal_id'),
    milestoneId: uuid('milestone_id'),
    title: text('title').notNull(),
    description: text('description'),
    domain: text('domain').notNull().default('other'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('todo'),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    estimateMinutes: integer('estimate_minutes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    source: text('source').notNull().default('manual'),
    importBatchId: uuid('import_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.id] }),
    titleCheck: check(
      'roadmap_tasks_title_check',
      sql`char_length(${table.title}) BETWEEN 1 AND 200`
    ),
    descriptionCheck: check(
      'roadmap_tasks_description_check',
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 4000`
    ),
    domainCheck: check(
      'roadmap_tasks_domain_check',
      sql`${table.domain} IN ('faith', 'personal', 'wealth', 'relationships', 'work', 'learning', 'other')`
    ),
    priorityCheck: check(
      'roadmap_tasks_priority_check',
      sql`${table.priority} IN ('low', 'medium', 'high')`
    ),
    statusCheck: check(
      'roadmap_tasks_status_check',
      sql`${table.status} IN ('todo', 'done', 'skipped', 'suggested')`
    ),
    sourceCheck: check(
      'roadmap_tasks_source_check',
      sql`${table.source} IN ('csv', 'ai', 'manual')`
    ),
    datesCheck: check(
      'roadmap_tasks_dates_check',
      sql`(${table.startDate} IS NULL OR ${table.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') AND (${table.dueDate} IS NULL OR ${table.dueDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`
    ),
    estimateCheck: check(
      'roadmap_tasks_estimate_check',
      sql`${table.estimateMinutes} IS NULL OR ${table.estimateMinutes} > 0`
    ),
    userGoalFk: foreignKey({
      name: 'roadmap_tasks_user_goal_fk',
      columns: [table.userId, table.goalId],
      foreignColumns: [roadmapGoals.userId, roadmapGoals.id],
    }).onDelete('cascade'),
    userMilestoneFk: foreignKey({
      name: 'roadmap_tasks_user_milestone_fk',
      columns: [table.userId, table.milestoneId],
      foreignColumns: [roadmapMilestones.userId, roadmapMilestones.id],
    }).onDelete('cascade'),
    userGoalMilestoneFk: foreignKey({
      name: 'roadmap_tasks_user_goal_milestone_fk',
      columns: [table.userId, table.goalId, table.milestoneId],
      foreignColumns: [roadmapMilestones.userId, roadmapMilestones.goalId, roadmapMilestones.id],
    }).onDelete('cascade'),
    userBatchFk: foreignKey({
      name: 'roadmap_tasks_user_batch_fk',
      columns: [table.userId, table.importBatchId],
      foreignColumns: [roadmapImportBatches.userId, roadmapImportBatches.id],
    }).onDelete('cascade'),
    userStatusDueIdx: index('roadmap_tasks_user_status_due_idx').on(
      table.userId,
      table.status,
      table.dueDate
    ),
    userGoalIdx: index('roadmap_tasks_user_goal_idx').on(table.userId, table.goalId),
    userMilestoneIdx: index('roadmap_tasks_user_milestone_idx').on(
      table.userId,
      table.milestoneId
    ),
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
export type WorkProject = typeof workProjects.$inferSelect;
export type NewWorkProject = typeof workProjects.$inferInsert;
export type WorkDailyLog = typeof workDailyLogs.$inferSelect;
export type NewWorkDailyLog = typeof workDailyLogs.$inferInsert;
export type FaithDailyLog = typeof faithDailyLogs.$inferSelect;
export type NewFaithDailyLog = typeof faithDailyLogs.$inferInsert;
export type FaithDhikrCount = typeof faithDhikrCounts.$inferSelect;
export type NewFaithDhikrCount = typeof faithDhikrCounts.$inferInsert;
export type FaithMemorizationLog = typeof faithMemorizationLogs.$inferSelect;
export type NewFaithMemorizationLog = typeof faithMemorizationLogs.$inferInsert;
export type FaithRakuProgress = typeof faithRakuProgress.$inferSelect;
export type NewFaithRakuProgress = typeof faithRakuProgress.$inferInsert;
export type FaithVocabWord = typeof faithVocabBank.$inferSelect;
export type NewFaithVocabWord = typeof faithVocabBank.$inferInsert;
export type FaithSetting = typeof faithSettings.$inferSelect;
export type NewFaithSetting = typeof faithSettings.$inferInsert;
export type RoadmapImportBatch = typeof roadmapImportBatches.$inferSelect;
export type NewRoadmapImportBatch = typeof roadmapImportBatches.$inferInsert;
export type RoadmapGoal = typeof roadmapGoals.$inferSelect;
export type NewRoadmapGoal = typeof roadmapGoals.$inferInsert;
export type RoadmapMilestone = typeof roadmapMilestones.$inferSelect;
export type NewRoadmapMilestone = typeof roadmapMilestones.$inferInsert;
export type RoadmapTask = typeof roadmapTasks.$inferSelect;
export type NewRoadmapTask = typeof roadmapTasks.$inferInsert;
