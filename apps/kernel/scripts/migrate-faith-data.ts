// Run from apps/kernel. `dotenv/config` reads apps/kernel/.env (not .env.local).
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import {
  faithDailyLogs,
  faithDhikrCounts,
  faithMemorizationLogs,
  faithRakuProgress,
  faithSettings,
  faithVocabBank,
  userSettings,
  type NewFaithDailyLog,
  type NewFaithDhikrCount,
  type NewFaithMemorizationLog,
  type NewFaithRakuProgress,
  type NewFaithSetting,
  type NewFaithVocabWord,
} from '@/db/schema';

const BATCH_SIZE = 250;
const TABLE_NAMES = [
  'daily_log',
  'dhikr_counts',
  'memorization_log',
  'raku_progress',
  'vocab_bank',
  'settings',
] as const;
type LegacyTableName = (typeof TABLE_NAMES)[number];
type LegacyRow = Record<string, unknown>;
type UserIdColumn = 'user_id' | 'userId' | null;
type SourceSql = NeonQueryFunction<false, false>;

interface Options {
  apply: boolean;
  userId: string | null;
}

interface TableScan {
  count: number;
  duplicateCount: number;
  hasDateColumn: boolean;
  minDate: string | null;
  maxDate: string | null;
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
    throw new Error(`Legacy data has an invalid '${name}' value.`);
  }
  return value;
}

function requiredDate(value: unknown): string {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) {
    throw new Error('Legacy data has an invalid date value.');
  }
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error('Legacy data has an invalid date value.');
  }
  return match[0];
}

function optionalInteger(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) throw new Error('Legacy data has an invalid integer value.');
  return parsed;
}

function optionalReal(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Legacy data has an invalid numeric value.');
  return parsed;
}

function optionalBoolean(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0') return false;
  if (value === 1 || value === '1') return true;
  throw new Error('Legacy data has an invalid boolean value.');
}

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error('Legacy data has an invalid text value.');
  return value;
}

function optionalDateTime(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') throw new Error('Legacy data has an invalid timestamp value.');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value);
  if (!match) throw new Error('Legacy timestamp must be text formatted in UTC.');
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText] = match;
  const date = new Date(Date.UTC(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText),
    Number(millisecondText)
  ));
  if (date.toISOString() !== value) throw new Error('Legacy data has an invalid timestamp value.');
  return date;
}

function findUserIdColumn(columns: Map<string, string>, tableName: string): UserIdColumn {
  if (columns.has('user_id')) return 'user_id';
  if (columns.has('userId')) return 'userId';
  if ([...columns.keys()].some((column) => column.toLowerCase() === 'userid')) {
    throw new Error(`${tableName} has an unsupported userId column name.`);
  }
  return null;
}

function requiredUserId(
  row: LegacyRow,
  column: UserIdColumn,
  fallbackUserId: string | null
): string {
  const value = column ? row[column] : fallbackUserId;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Legacy tables without userId columns require --user-id.');
  }
  return value;
}

function mapDailyLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithDailyLog {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    date: requiredDate(row.date),
    fajr: optionalBoolean(row.fajr),
    dhuhr: optionalBoolean(row.dhuhr),
    asr: optionalBoolean(row.asr),
    maghrib: optionalBoolean(row.maghrib),
    isha: optionalBoolean(row.isha),
    onTime: optionalInteger(field(row, 'on_time', 'onTime')),
    morningAdhkar: optionalBoolean(field(row, 'morning_adhkar', 'morningAdhkar')),
    eveningAdhkar: optionalBoolean(field(row, 'evening_adhkar', 'eveningAdhkar')),
    beforeSleepAdhkar: optionalBoolean(field(row, 'before_sleep_adhkar', 'beforeSleepAdhkar')),
    dhikrMinutes: optionalInteger(field(row, 'dhikr_minutes', 'dhikrMinutes')),
    duaMinutes: optionalInteger(field(row, 'dua_minutes', 'duaMinutes')),
    laIlaha: optionalBoolean(field(row, 'la_ilaha', 'laIlaha')),
    subhanallahi: optionalBoolean(row.subhanallahi),
    quranPages: optionalInteger(field(row, 'quran_pages', 'quranPages')),
    tadabburMinutes: optionalInteger(field(row, 'tadabbur_minutes', 'tadabburMinutes')),
    tafseerDone: optionalBoolean(field(row, 'tafseer_done', 'tafseerDone')),
    tajweedConfidence: optionalInteger(field(row, 'tajweed_confidence', 'tajweedConfidence')),
    verseDone: optionalBoolean(field(row, 'verse_done', 'verseDone')),
    islamicStudyMinutes: optionalInteger(field(row, 'islamic_study_minutes', 'islamicStudyMinutes')),
    surahMulk: optionalBoolean(field(row, 'surah_mulk', 'surahMulk')),
    surahKahf: optionalBoolean(field(row, 'surah_kahf', 'surahKahf')),
    gazeLowered: optionalInteger(field(row, 'gaze_lowered', 'gazeLowered')),
    haramFree: optionalBoolean(field(row, 'haram_free', 'haramFree')),
    finalScore: optionalInteger(field(row, 'final_score', 'finalScore')),
    rawScore: optionalReal(field(row, 'raw_score', 'rawScore')),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
  };
}

function mapDhikrCount(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithDhikrCount {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    date: requiredDate(row.date),
    dhikrKey: requiredString(field(row, 'dhikr_key', 'dhikrKey'), 'dhikr_key'),
    count: optionalInteger(row.count),
    target: optionalInteger(row.target, 100),
    completed: optionalBoolean(row.completed),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
  };
}

function mapMemorizationLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithMemorizationLog {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    verseIndex: optionalInteger(field(row, 'verse_index', 'verseIndex')),
    date: requiredDate(row.date),
    done: optionalBoolean(row.done),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
  };
}

function mapRakuProgress(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithRakuProgress {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    rakuNumber: optionalInteger(field(row, 'raku_number', 'rakuNumber')),
    tafseerDone: optionalBoolean(field(row, 'tafseer_done', 'tafseerDone')),
    tajweedConfidence: optionalInteger(field(row, 'tajweed_confidence', 'tajweedConfidence')),
    vocabExtracted: optionalBoolean(field(row, 'vocab_extracted', 'vocabExtracted')),
    completedAt: optionalDateTime(field(row, 'completed_at', 'completedAt')) ?? null,
    notes: optionalText(row.notes),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
  };
}

function mapVocabWord(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithVocabWord {
  const userId = requiredUserId(row, userIdColumn, fallbackUserId);
  return {
    id: stableVocabId(userId, row.id),
    userId,
    rakuNumber: optionalInteger(field(row, 'raku_number', 'rakuNumber')),
    word: requiredString(row.word, 'word'),
    root: optionalText(row.root),
    meaning: requiredString(row.meaning, 'meaning'),
    status: optionalText(row.status) ?? 'new',
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
  };
}

function stableVocabId(userId: string, legacyId: unknown): string {
  const id = optionalInteger(legacyId, Number.NaN);
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error('vocab_bank contains a row without a valid numeric id.');
  }
  const bytes = createHash('sha256')
    .update(`${userId}\u0000vocab_bank\u0000${id}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapSetting(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewFaithSetting {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    key: requiredString(row.key, 'key'),
    value: requiredString(row.value, 'value'),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
  };
}

function settingKind(key: string): 'faith' | 'gemini' | 'excluded' | 'unknown' {
  if (
    key === 'current_verse_index' ||
    key === 'hijri_adjustment' ||
    /^hijri_override_\d{4}-\d{2}-\d{2}$/.test(key)
  ) {
    return 'faith';
  }
  if (key === 'gemini_api_key') return 'gemini';
  if (
    key === 'verse_last_advanced' ||
    /^(SK_URL|SK_API_KEY|PULL_SECRET)$/.test(key)
  ) {
    return 'excluded';
  }
  return 'unknown';
}

type LegacyColumns = Map<LegacyTableName, Map<string, string>>;

async function readColumns(sourceSql: SourceSql): Promise<LegacyColumns> {
  const placeholders = TABLE_NAMES.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await sourceSql(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name IN (${placeholders})`,
    [...TABLE_NAMES]
  );
  const columns = new Map(TABLE_NAMES.map((tableName) => [tableName, new Map<string, string>()]));
  for (const row of rows) {
    const tableName = requiredString(row.table_name, 'table_name') as LegacyTableName;
    columns.get(tableName)?.set(
      requiredString(row.column_name, 'column_name'),
      requiredString(row.data_type, 'data_type')
    );
  }
  return columns;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function selectColumns(columns: Map<string, string>): string {
  return [...columns].map(([column, dataType]) => {
    const quoted = quoteIdentifier(column);
    if (dataType === 'date') return `${quoted}::text AS ${quoted}`;
    if (dataType === 'timestamp without time zone') {
      return `to_char(${quoted} AT TIME ZONE 'UTC' AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z' AS ${quoted}`;
    }
    if (dataType === 'timestamp with time zone') {
      return `to_char(${quoted} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z' AS ${quoted}`;
    }
    return quoted;
  }).join(', ');
}

async function fetchBatch(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  lastId: number | null,
  columns: LegacyColumns
): Promise<LegacyRow[]> {
  const select = selectColumns(columns.get(tableName)!);
  const rows = lastId === null
    ? await sourceSql(`SELECT ${select} FROM "${tableName}" ORDER BY "id" LIMIT $1`, [BATCH_SIZE])
    : await sourceSql(
        `SELECT ${select} FROM "${tableName}" WHERE "id" > $1 ORDER BY "id" LIMIT $2`,
        [lastId, BATCH_SIZE]
      );
  return rows as LegacyRow[];
}

function naturalKey(
  tableName: LegacyTableName,
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): string {
  const userId = requiredUserId(row, userIdColumn, fallbackUserId);
  if (tableName === 'daily_log' || tableName === 'memorization_log') {
    return `${userId}\u0000${requiredDate(row.date)}`;
  }
  if (tableName === 'dhikr_counts') {
    return `${userId}\u0000${requiredDate(row.date)}\u0000${requiredString(
      field(row, 'dhikr_key', 'dhikrKey'),
      'dhikr_key'
    )}`;
  }
  if (tableName === 'raku_progress') {
    return `${userId}\u0000${optionalInteger(field(row, 'raku_number', 'rakuNumber'))}`;
  }
  if (tableName === 'vocab_bank') {
    return `${userId}\u0000${optionalInteger(row.id, Number.NaN)}`;
  }
  return `${userId}\u0000${requiredString(row.key, 'key')}`;
}

async function scanTable(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  columns: LegacyColumns
): Promise<TableScan> {
  const seen = new Set<string>();
  let count = 0;
  let duplicateCount = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, tableName, lastId, columns);
    if (rows.length === 0) break;
    for (const row of rows) {
      const id = optionalInteger(row.id, Number.NaN);
      if (!Number.isInteger(id)) throw new Error(`${tableName} contains a row without a numeric id.`);
      const key = naturalKey(tableName, row, userIdColumn, fallbackUserId);
      if (seen.has(key)) duplicateCount += 1;
      else seen.add(key);
      if (columns.get(tableName)?.get('date') === 'date') {
        const rowDate = requiredDate(row.date);
        if (minDate === null || rowDate < minDate) minDate = rowDate;
        if (maxDate === null || rowDate > maxDate) maxDate = rowDate;
      }
      count += 1;
      lastId = id;
    }
  }
  return {
    count,
    duplicateCount,
    hasDateColumn: columns.get(tableName)?.get('date') === 'date',
    minDate,
    maxDate,
  };
}

async function copyBatches<T>(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  columns: LegacyColumns,
  mapRow: (row: LegacyRow, column: UserIdColumn, fallback: string | null) => T,
  insertRows: (rows: T[]) => Promise<number>
): Promise<{ scanned: number; inserted: number }> {
  let scanned = 0;
  let inserted = 0;
  let lastId: number | null = null;
  for (;;) {
    const rows = await fetchBatch(sourceSql, tableName, lastId, columns);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapRow(row, userIdColumn, fallbackUserId));
    inserted += await insertRows(mapped);
    scanned += rows.length;
    lastId = optionalInteger(rows[rows.length - 1].id, Number.NaN);
    if (!Number.isInteger(lastId)) throw new Error(`${tableName} contains a row without a numeric id.`);
  }
  return { scanned, inserted };
}

async function copySettings(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  columns: LegacyColumns
): Promise<{ scanned: number; faithInserted: number; geminiTransferred: number; skipped: number }> {
  let scanned = 0;
  let faithInserted = 0;
  let geminiTransferred = 0;
  let skipped = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'settings', lastId, columns);
    if (rows.length === 0) break;
    for (const row of rows) {
      scanned += 1;
      const key = requiredString(row.key, 'key');
      const kind = settingKind(key);
      if (kind === 'faith') {
        const setting = mapSetting(row, userIdColumn, fallbackUserId);
        faithInserted += (await db
          .insert(faithSettings)
          .values(setting)
          .onConflictDoNothing({ target: [faithSettings.userId, faithSettings.key] })
          .returning({ id: faithSettings.id })).length;
      } else if (kind === 'gemini') {
        const userId = requiredUserId(row, userIdColumn, fallbackUserId);
        const legacyKey = requiredString(row.value, 'value');
        const [existing] = await db
          .select({ geminiKey1: userSettings.geminiKey1 })
          .from(userSettings)
          .where(eq(userSettings.userId, userId));

        if (existing) {
          const updated = await db
            .update(userSettings)
            .set({ geminiKey1: legacyKey, updatedAt: new Date() })
            .where(and(
              eq(userSettings.userId, userId),
              or(isNull(userSettings.geminiKey1), eq(userSettings.geminiKey1, ''))
            ))
            .returning({ userId: userSettings.userId });
          geminiTransferred += updated.length;
          skipped += updated.length === 0 ? 1 : 0;
        } else {
          const inserted = await db
            .insert(userSettings)
            .values({ userId, geminiKey1: legacyKey })
            .onConflictDoNothing({ target: userSettings.userId })
            .returning({ userId: userSettings.userId });
          geminiTransferred += inserted.length;
          skipped += inserted.length === 0 ? 1 : 0;
        }
      } else {
        skipped += 1;
      }
    }
    lastId = optionalInteger(rows[rows.length - 1].id, Number.NaN);
    if (!Number.isInteger(lastId)) throw new Error('settings contains a row without a numeric id.');
  }
  return { scanned, faithInserted, geminiTransferred, skipped };
}

function redactDatabaseUrls(message: string): string {
  return message.replace(/(?:postgres(?:ql)?):\/\/[^\s"'<>]+/gi, '[database URL redacted]');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sourceUrl = process.env.FAITH_DATABASE_URL;
  if (!sourceUrl) throw new Error('FAITH_DATABASE_URL must be set.');
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
  const hasMissingUserId = TABLE_NAMES.some((tableName) => userIdColumns.get(tableName) === null);
  if (options.apply && hasMissingUserId && !options.userId) {
    throw new Error('Legacy tables without userId columns require --user-id with --apply.');
  }
  if (options.userId && !hasMissingUserId) {
    console.log('Legacy rows already contain userId; --user-id is not used.');
  }

  const scans = new Map<LegacyTableName, TableScan>();
  for (const tableName of TABLE_NAMES) {
    scans.set(
      tableName,
      await scanTable(
        sourceSql,
        tableName,
        userIdColumns.get(tableName)!,
        options.userId,
        columns
      )
    );
  }
  for (const [tableName, result] of scans) {
    console.log(`${tableName}: ${result.count} source row(s); ${result.duplicateCount} duplicate natural key(s).`);
    if (!options.apply) {
      const minDate = result.hasDateColumn ? result.minDate ?? 'none' : 'N/A (no date column)';
      const maxDate = result.hasDateColumn ? result.maxDate ?? 'none' : 'N/A (no date column)';
      console.log(`  min date: ${minDate}; max date: ${maxDate}`);
    }
  }
  if ([...scans.values()].some((result) => result.duplicateCount > 0)) {
    throw new Error('Duplicate natural keys found; no data was migrated.');
  }

  const unknownSettingNames = new Set<string>();
  const settingRows = await fetchAllSettingNames(sourceSql, columns);
  for (const key of settingRows) {
    if (settingKind(key) === 'unknown') unknownSettingNames.add(key);
  }
  if (unknownSettingNames.size > 0) {
    console.log(`Unknown setting names skipped: ${[...unknownSettingNames].join(', ')}`);
  }

  if (!options.apply) {
    console.log('Dry run only; no target rows were written.');
    if (hasMissingUserId && !options.userId) {
      console.log('Pass --user-id YOUR_GOOGLE_SUB with --apply to assign legacy rows that have no userId column.');
    }
    console.log('SK credentials are not copied; the legacy Gemini key is transferred only if Kernel Gemini key 1 is empty.');
    return;
  }

  const dailyResult = await copyBatches(
    sourceSql,
    'daily_log',
    userIdColumns.get('daily_log')!,
    options.userId,
    columns,
    mapDailyLog,
    async (rows) => (await db
      .insert(faithDailyLogs)
      .values(rows)
      .onConflictDoNothing({ target: [faithDailyLogs.userId, faithDailyLogs.date] })
      .returning({ id: faithDailyLogs.id })).length
  );
  reportCopied('daily_log', dailyResult);

  const dhikrResult = await copyBatches(
    sourceSql,
    'dhikr_counts',
    userIdColumns.get('dhikr_counts')!,
    options.userId,
    columns,
    mapDhikrCount,
    async (rows) => (await db
      .insert(faithDhikrCounts)
      .values(rows)
      .onConflictDoNothing({
        target: [faithDhikrCounts.userId, faithDhikrCounts.date, faithDhikrCounts.dhikrKey],
      })
      .returning({ id: faithDhikrCounts.id })).length
  );
  reportCopied('dhikr_counts', dhikrResult);

  const memorizationResult = await copyBatches(
    sourceSql,
    'memorization_log',
    userIdColumns.get('memorization_log')!,
    options.userId,
    columns,
    mapMemorizationLog,
    async (rows) => (await db
      .insert(faithMemorizationLogs)
      .values(rows)
      .onConflictDoNothing({
        target: [faithMemorizationLogs.userId, faithMemorizationLogs.date],
      })
      .returning({ id: faithMemorizationLogs.id })).length
  );
  reportCopied('memorization_log', memorizationResult);

  const rakuResult = await copyBatches(
    sourceSql,
    'raku_progress',
    userIdColumns.get('raku_progress')!,
    options.userId,
    columns,
    mapRakuProgress,
    async (rows) => (await db
      .insert(faithRakuProgress)
      .values(rows)
      .onConflictDoNothing({
        target: [faithRakuProgress.userId, faithRakuProgress.rakuNumber],
      })
      .returning({ id: faithRakuProgress.id })).length
  );
  reportCopied('raku_progress', rakuResult);

  const vocabResult = await copyBatches(
    sourceSql,
    'vocab_bank',
    userIdColumns.get('vocab_bank')!,
    options.userId,
    columns,
    mapVocabWord,
    async (rows) => (await db
      .insert(faithVocabBank)
      .values(rows)
      .onConflictDoNothing({ target: [faithVocabBank.userId, faithVocabBank.id] })
      .returning({ id: faithVocabBank.id })).length
  );
  reportCopied('vocab_bank', vocabResult);

  const settingsResult = await copySettings(
    sourceSql,
    userIdColumns.get('settings')!,
    options.userId,
    columns
  );
  console.log(
    `settings: scanned ${settingsResult.scanned}; Faith settings inserted ${settingsResult.faithInserted}; Gemini keys transferred ${settingsResult.geminiTransferred}; skipped/retained ${settingsResult.skipped}.`
  );
  console.log('SK URL/API and pull-secret credentials were not copied.');
}

async function fetchAllSettingNames(
  sourceSql: SourceSql,
  columns: LegacyColumns
): Promise<string[]> {
  const keys = new Set<string>();
  let lastId: number | null = null;
  for (;;) {
    const rows = await fetchBatch(sourceSql, 'settings', lastId, columns);
    if (rows.length === 0) break;
    for (const row of rows) keys.add(requiredString(row.key, 'key'));
    lastId = optionalInteger(rows[rows.length - 1].id, Number.NaN);
    if (!Number.isInteger(lastId)) throw new Error('settings contains a row without a numeric id.');
  }
  return [...keys];
}

function reportCopied(tableName: LegacyTableName, result: { scanned: number; inserted: number }): void {
  console.log(
    `${tableName}: scanned ${result.scanned}; inserted ${result.inserted}; already present ${result.scanned - result.inserted}.`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? redactDatabaseUrls(error.message) : 'Unknown error';
  console.error('Faith data migration failed:', message);
  process.exitCode = 1;
});
