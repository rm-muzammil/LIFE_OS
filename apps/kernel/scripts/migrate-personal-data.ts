// Run from apps/kernel. `dotenv/config` reads apps/kernel/.env (not .env.local).
import 'dotenv/config';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  personalDailyLogs,
  personalExerciseLogs,
  personalWorkoutPlans,
  userSettings,
  type NewPersonalDailyLog,
  type NewPersonalExerciseLog,
  type NewPersonalWorkoutPlan,
} from '@/db/schema';

const BATCH_SIZE = 250;
const TABLE_NAMES = ['daily_log', 'workout_plans', 'exercise_logs', 'settings'] as const;
type LegacyTableName = (typeof TABLE_NAMES)[number];
type LegacyRow = Record<string, unknown>;
type UserIdColumn = 'user_id' | 'userId' | null;
type SourceSql = NeonQueryFunction<false, false>;

interface Options {
  apply: boolean;
  userId: string | null;
}

function parseOptions(args: string[]): Options {
  let apply = false;
  let dryRun = false;
  let userId: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') {
      apply = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--user-id') {
      const value = args[index + 1];
      if (!value || value.startsWith('--') || !value.trim()) {
        throw new Error('--user-id requires a Google sub value.');
      }
      userId = value.trim();
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (apply && dryRun) throw new Error('Use either --apply or --dry-run, not both.');
  return { apply, userId };
}

function field(row: LegacyRow, snake: string, camel = snake): unknown {
  return row[snake] ?? row[camel];
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Legacy row has an invalid '${name}' value.`);
  }
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error(`Legacy row has an invalid '${name}' value.`);
  return value;
}

function optionalNumber(value: unknown, fallback: number | null = null): number | null {
  if (value == null) return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error('Legacy row has an invalid numeric value.');
  return number;
}

function optionalBoolean(value: unknown, fallback: boolean | null = null): boolean | null {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0') return false;
  if (value === 1 || value === '1') return true;
  throw new Error('Legacy row has an invalid boolean value.');
}

function optionalDate(value: unknown): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(requiredString(value, 'timestamp'));
  if (Number.isNaN(date.getTime())) throw new Error('Legacy row has an invalid timestamp value.');
  return date;
}

function requiredJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new Error('Legacy workout plan contains invalid JSON.');
    }
  }
  if (value == null) throw new Error('Legacy workout plan is missing.');
  return value;
}

function rowUserId(
  row: LegacyRow,
  column: UserIdColumn,
  fallbackUserId: string | null
): string {
  if (column) return requiredString(row[column], column);
  if (fallbackUserId) return fallbackUserId;
  throw new Error('Legacy tables have no userId column; pass --user-id to assign these rows.');
}

function mapDailyLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewPersonalDailyLog {
  return {
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    date: requiredString(row.date, 'date'),
    workoutDone: optionalBoolean(field(row, 'workout_done', 'workoutDone')),
    allSetsDone: optionalBoolean(field(row, 'all_sets_done', 'allSetsDone')),
    effortRating: optionalNumber(field(row, 'effort_rating', 'effortRating')),
    isRestDay: optionalBoolean(field(row, 'is_rest_day', 'isRestDay')),
    calories: optionalNumber(row.calories),
    protein: optionalNumber(row.protein),
    meals: optionalBoolean(row.meals),
    sleepHours: optionalNumber(field(row, 'sleep_hours', 'sleepHours')),
    productiveHours: optionalNumber(field(row, 'productive_hours', 'productiveHours')),
    socialMediaOk: optionalBoolean(field(row, 'social_media_ok', 'socialMediaOk')),
    helpedSomeone: optionalBoolean(field(row, 'helped_someone', 'helpedSomeone')),
    contactedParents: optionalBoolean(field(row, 'contacted_parents', 'contactedParents')),
    familyTies: optionalBoolean(field(row, 'family_ties', 'familyTies')),
    charityAmount: optionalNumber(field(row, 'charity_amount', 'charityAmount')),
    goodDeeds: optionalNumber(field(row, 'good_deeds', 'goodDeeds')),
    totalScore: optionalNumber(field(row, 'total_score', 'totalScore')),
    updatedAt: optionalDate(field(row, 'updated_at', 'updatedAt')) ?? undefined,
  };
}

function mapWorkoutPlan(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewPersonalWorkoutPlan {
  return {
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    weekStart: requiredString(field(row, 'week_start', 'weekStart'), 'week_start'),
    day: requiredString(row.day, 'day'),
    date: requiredString(row.date, 'date'),
    plan: requiredJson(row.plan),
    generatedAt: optionalDate(field(row, 'generated_at', 'generatedAt')) ?? undefined,
  };
}

function mapExerciseLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewPersonalExerciseLog {
  return {
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    date: requiredString(row.date, 'date'),
    exerciseName: requiredString(field(row, 'exercise_name', 'exerciseName'), 'exercise_name'),
    setsPlanned: optionalNumber(field(row, 'sets_planned', 'setsPlanned')),
    setsCompleted: optionalNumber(field(row, 'sets_completed', 'setsCompleted')),
    reps: nullableString(row.reps, 'reps') ?? '',
    notes: nullableString(row.notes, 'notes'),
  };
}

async function readColumns(sourceSql: SourceSql): Promise<Map<LegacyTableName, Set<string>>> {
  const placeholders = TABLE_NAMES.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await sourceSql(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name IN (${placeholders})`,
    [...TABLE_NAMES]
  );
  const columns = new Map(TABLE_NAMES.map((tableName) => [tableName, new Set<string>()]));
  for (const row of rows) {
    const tableName = requiredString(row.table_name, 'table_name') as LegacyTableName;
    columns.get(tableName)?.add(requiredString(row.column_name, 'column_name'));
  }
  return columns;
}

function findUserIdColumn(columns: Set<string>, tableName: string): UserIdColumn {
  if (columns.has('user_id')) return 'user_id';
  if (columns.has('userId')) return 'userId';
  if ([...columns].some((column) => column.toLowerCase() === 'userid')) {
    throw new Error(`${tableName} has an unsupported userId column name.`);
  }
  return null;
}

async function fetchBatch(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  lastId: number | null
): Promise<LegacyRow[]> {
  const rows = lastId === null
    ? await sourceSql(`SELECT * FROM "${tableName}" ORDER BY "id" LIMIT $1`, [BATCH_SIZE])
    : await sourceSql(
        `SELECT * FROM "${tableName}" WHERE "id" > $1 ORDER BY "id" LIMIT $2`,
        [lastId, BATCH_SIZE]
      );
  return rows as LegacyRow[];
}

function naturalKey(tableName: LegacyTableName, row: LegacyRow, userId: string): string {
  if (tableName === 'daily_log') return `${userId}\u0000${requiredString(row.date, 'date')}`;
  if (tableName === 'workout_plans') return `${userId}\u0000${requiredString(row.date, 'date')}`;
  if (tableName === 'exercise_logs') {
    return `${userId}\u0000${requiredString(row.date, 'date')}\u0000${requiredString(
      field(row, 'exercise_name', 'exerciseName'),
      'exercise_name'
    )}`;
  }
  return userId;
}

async function scanTable(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ count: number; duplicateCount: number; duplicateExamples: string[] }> {
  let count = 0;
  let duplicateCount = 0;
  let lastId: number | null = null;
  const seen = new Set<string>();
  const duplicateExamples: string[] = [];

  for (;;) {
    const rows = await fetchBatch(sourceSql, tableName, lastId);
    if (rows.length === 0) break;
    for (const row of rows) {
      const id = optionalNumber(row.id);
      if (id === null) throw new Error(`${tableName} contains a row without a numeric id.`);
      const userId = rowUserId(row, userIdColumn, fallbackUserId ?? '__unassigned_user__');
      const key = naturalKey(tableName, row, userId);
      if (seen.has(key)) {
        duplicateCount++;
        if (duplicateExamples.length < 5) duplicateExamples.push(key.replaceAll('\u0000', ' / '));
      } else {
        seen.add(key);
      }
      count++;
      lastId = id;
    }
  }
  return { count, duplicateCount, duplicateExamples };
}

async function copyBatches<T>(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  mapRow: (row: LegacyRow, column: UserIdColumn, fallback: string | null) => T,
  insertRows: (rows: T[]) => Promise<number>
): Promise<{ scanned: number; inserted: number }> {
  let scanned = 0;
  let inserted = 0;
  let lastId: number | null = null;
  for (;;) {
    const rows = await fetchBatch(sourceSql, tableName, lastId);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapRow(row, userIdColumn, fallbackUserId));
    inserted += await insertRows(mapped);
    scanned += rows.length;
    lastId = optionalNumber(rows[rows.length - 1].id);
    if (lastId === null) throw new Error(`${tableName} contains a row without a numeric id.`);
  }
  return { scanned, inserted };
}

async function migrateLegacySettings(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ scanned: number; transferred: number; retained: number }> {
  let scanned = 0;
  let transferred = 0;
  let retained = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'settings', lastId);
    if (rows.length === 0) break;
    for (const row of rows) {
      scanned++;
      const userId = rowUserId(row, userIdColumn, fallbackUserId);
      const legacyKey = nullableString(field(row, 'gemini_api_key', 'geminiApiKey'), 'gemini_api_key');
      if (!legacyKey) {
        retained++;
        continue;
      }

      const [existing] = await db
        .select({ geminiKey1: userSettings.geminiKey1 })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      if (existing?.geminiKey1) {
        retained++;
      } else if (existing) {
        const updated = await db
          .update(userSettings)
          .set({ geminiKey1: legacyKey, updatedAt: new Date() })
          .where(and(eq(userSettings.userId, userId), isNull(userSettings.geminiKey1)))
          .returning({ userId: userSettings.userId });
        transferred += updated.length;
        retained += updated.length === 0 ? 1 : 0;
      } else {
        const inserted = await db
          .insert(userSettings)
          .values({ userId, geminiKey1: legacyKey })
          .onConflictDoNothing({ target: userSettings.userId })
          .returning({ userId: userSettings.userId });
        transferred += inserted.length;
        retained += inserted.length === 0 ? 1 : 0;
      }
    }
    lastId = optionalNumber(rows[rows.length - 1].id);
    if (lastId === null) throw new Error('settings contains a row without a numeric id.');
  }
  return { scanned, transferred, retained };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sourceUrl = process.env.PERSONAL_DATABASE_URL;
  if (!sourceUrl) throw new Error('PERSONAL_DATABASE_URL must be set.');
  if (options.apply && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to apply rows to Kernel.');
  }

  const sourceSql: SourceSql = neon(sourceUrl);
  const columns = await readColumns(sourceSql);
  for (const tableName of TABLE_NAMES) {
    if (columns.get(tableName)?.size === 0) {
      throw new Error(`Legacy table '${tableName}' was not found in the source database.`);
    }
  }

  const userIdColumns = new Map(
    TABLE_NAMES.map((tableName) => [
      tableName,
      findUserIdColumn(columns.get(tableName)!, tableName),
    ])
  );
  const hasUserId = TABLE_NAMES.map((tableName) => userIdColumns.get(tableName) !== null);
  if (hasUserId.some(Boolean) && hasUserId.some((value) => !value)) {
    throw new Error('Legacy tables have inconsistent userId columns; refusing ambiguous migration.');
  }
  const sourceHasUserId = hasUserId.every(Boolean);
  if (sourceHasUserId && options.userId) {
    console.log('Source already has userId columns; --user-id will be ignored.');
  }
  if (!sourceHasUserId && options.apply && !options.userId) {
    throw new Error('Legacy tables have no userId column; --user-id is required with --apply.');
  }

  const fallbackUserId = sourceHasUserId ? null : options.userId;
  const scans = new Map<LegacyTableName, Awaited<ReturnType<typeof scanTable>>>();
  for (const tableName of TABLE_NAMES) {
    scans.set(
      tableName,
      await scanTable(
        sourceSql,
        tableName,
        userIdColumns.get(tableName)!,
        fallbackUserId
      )
    );
  }
  const duplicates = [...scans.entries()].filter(([, result]) => result.duplicateCount > 0);
  for (const [tableName, result] of scans) {
    console.log(
      `${tableName}: ${result.count} source row(s); ${result.duplicateCount} duplicate natural key(s).`
    );
    for (const example of result.duplicateExamples) {
      console.log(`  duplicate key: ${example}`);
    }
  }
  if (duplicates.length > 0) {
    throw new Error('Duplicate natural keys found; no data was migrated.');
  }

  if (!options.apply) {
    console.log('Dry run only; no target rows were written.');
    if (!sourceHasUserId) {
      console.log('Use --user-id <Google sub> with --apply to assign the legacy single-user rows.');
    }
    console.log('Legacy SK URL/API key values are not copied; a legacy Gemini key fills Kernel user_settings only if key 1 is empty.');
    return;
  }

  const results = [
    await copyBatches(
      sourceSql,
      'daily_log',
      userIdColumns.get('daily_log')!,
      fallbackUserId,
      mapDailyLog,
      async (rows) => (await db
        .insert(personalDailyLogs)
        .values(rows)
        .onConflictDoNothing({
          target: [personalDailyLogs.userId, personalDailyLogs.date],
        })
        .returning({ id: personalDailyLogs.id })).length
    ),
    await copyBatches(
      sourceSql,
      'workout_plans',
      userIdColumns.get('workout_plans')!,
      fallbackUserId,
      mapWorkoutPlan,
      async (rows) => (await db
        .insert(personalWorkoutPlans)
        .values(rows)
        .onConflictDoNothing({
          target: [personalWorkoutPlans.userId, personalWorkoutPlans.date],
        })
        .returning({ id: personalWorkoutPlans.id })).length
    ),
    await copyBatches(
      sourceSql,
      'exercise_logs',
      userIdColumns.get('exercise_logs')!,
      fallbackUserId,
      mapExerciseLog,
      async (rows) => (await db
        .insert(personalExerciseLogs)
        .values(rows)
        .onConflictDoNothing({
          target: [
            personalExerciseLogs.userId,
            personalExerciseLogs.date,
            personalExerciseLogs.exerciseName,
          ],
        })
        .returning({ id: personalExerciseLogs.id })).length
    ),
  ];
  for (const [index, tableName] of ['daily_log', 'workout_plans', 'exercise_logs'].entries()) {
    const result = results[index];
    console.log(
      `${tableName}: scanned ${result.scanned}; inserted ${result.inserted}; already present ${result.scanned - result.inserted}.`
    );
  }
  const settings = await migrateLegacySettings(
    sourceSql,
    userIdColumns.get('settings')!,
    fallbackUserId
  );
  console.log(
    `settings: scanned ${settings.scanned}; Gemini keys transferred ${settings.transferred}; skipped/retained ${settings.retained}; SK URL/API key not copied.`
  );
}

main().catch((error: unknown) => {
  console.error('Personal data migration failed:', error);
  process.exitCode = 1;
});
