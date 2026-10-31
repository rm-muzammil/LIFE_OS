// Run from apps/kernel. `dotenv/config` reads apps/kernel/.env (not .env.local).
import 'dotenv/config';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type {
  NewRelationshipsDailyLog,
  NewRelationshipsSetting,
} from '@/db/schema';

const BATCH_SIZE = 250;
const TABLE_NAMES = ['daily_log', 'settings'] as const;
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
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return requiredString(value, 'date');
}

function optionalInteger(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) throw new Error('Legacy data has an invalid integer value.');
  return parsed;
}

function optionalBoolean(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0') return false;
  if (value === 1 || value === '1') return true;
  throw new Error('Legacy data has an invalid boolean value.');
}

function optionalText(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value !== 'string') throw new Error('Legacy data has an invalid text value.');
  return value;
}

function optionalDateTime(value: unknown): Date | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(requiredString(value, 'timestamp'));
  if (Number.isNaN(date.getTime())) throw new Error('Legacy data has an invalid timestamp value.');
  return date;
}

function findUserIdColumn(columns: Set<string>, tableName: string): UserIdColumn {
  if (columns.has('user_id')) return 'user_id';
  if (columns.has('userId')) return 'userId';
  if ([...columns].some((column) => column.toLowerCase() === 'userid')) {
    throw new Error(`${tableName} has an unsupported userId column name.`);
  }
  return null;
}

function resolveUserId(
  row: LegacyRow,
  column: UserIdColumn,
  fallbackUserId: string | null
): string | null {
  if (column) return requiredString(row[column], column);
  return fallbackUserId;
}

function requiredUserId(
  row: LegacyRow,
  column: UserIdColumn,
  fallbackUserId: string | null
): string {
  const userId = resolveUserId(row, column, fallbackUserId);
  if (!userId) {
    throw new Error('Legacy tables have no userId column; pass --user-id to assign these rows.');
  }
  return userId;
}

function mapDailyLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewRelationshipsDailyLog {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    date: requiredDate(row.date),
    contactedParents: optionalBoolean(field(row, 'contacted_parents', 'contactedParents')),
    familyTies: optionalBoolean(field(row, 'family_ties', 'familyTies')),
    helpedSomeone: optionalBoolean(field(row, 'helped_someone', 'helpedSomeone')),
    goodDeed: optionalBoolean(field(row, 'good_deed', 'goodDeed')),
    communityObligation: optionalBoolean(field(row, 'community_obligation', 'communityObligation')),
    charityAmount: optionalInteger(field(row, 'charity_amount', 'charityAmount'), 0),
    goodDeedsCount: optionalInteger(field(row, 'good_deeds_count', 'goodDeedsCount'), 0),
    notes: optionalText(row.notes),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt')),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
  };
}

function mapSetting(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewRelationshipsSetting {
  return {
    userId: requiredUserId(row, userIdColumn, fallbackUserId),
    key: requiredString(row.key, 'key'),
    value: optionalText(row.value),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt')),
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

async function fetchDailyBatch(sourceSql: SourceSql, lastId: number | null): Promise<LegacyRow[]> {
  const rows = lastId === null
    ? await sourceSql(`SELECT * FROM "daily_log" ORDER BY "id" LIMIT $1`, [BATCH_SIZE])
    : await sourceSql(
        `SELECT * FROM "daily_log" WHERE "id" > $1 ORDER BY "id" LIMIT $2`,
        [lastId, BATCH_SIZE]
      );
  return rows as LegacyRow[];
}

async function fetchSettingsBatch(sourceSql: SourceSql, lastKey: string | null): Promise<LegacyRow[]> {
  const rows = lastKey === null
    ? await sourceSql(`SELECT * FROM "settings" ORDER BY "key" LIMIT $1`, [BATCH_SIZE])
    : await sourceSql(
        `SELECT * FROM "settings" WHERE "key" > $1 ORDER BY "key" LIMIT $2`,
        [lastKey, BATCH_SIZE]
      );
  return rows as LegacyRow[];
}

function dailyNaturalKey(row: LegacyRow, userIdColumn: UserIdColumn, fallbackUserId: string | null): string {
  const userId = resolveUserId(row, userIdColumn, fallbackUserId) ?? '';
  return `${userId}\u0000${requiredDate(row.date)}`;
}

function settingNaturalKey(row: LegacyRow, userIdColumn: UserIdColumn, fallbackUserId: string | null): string {
  const userId = resolveUserId(row, userIdColumn, fallbackUserId) ?? '';
  return `${userId}\u0000${requiredString(row.key, 'key')}`;
}

async function scanDailyLogs(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<TableScan> {
  const seen = new Set<string>();
  let count = 0;
  let duplicateCount = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchDailyBatch(sourceSql, lastId);
    if (rows.length === 0) break;
    for (const row of rows) {
      const key = dailyNaturalKey(row, userIdColumn, fallbackUserId);
      if (seen.has(key)) duplicateCount += 1;
      else seen.add(key);
      count += 1;
      const id = optionalInteger(row.id, Number.NaN);
      if (!Number.isInteger(id)) throw new Error('daily_log contains a row without a numeric id.');
      lastId = id;
    }
  }
  return { count, duplicateCount };
}

async function scanSettings(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<TableScan> {
  const seen = new Set<string>();
  let count = 0;
  let duplicateCount = 0;
  let lastKey: string | null = null;

  for (;;) {
    const rows = await fetchSettingsBatch(sourceSql, lastKey);
    if (rows.length === 0) break;
    for (const row of rows) {
      const key = settingNaturalKey(row, userIdColumn, fallbackUserId);
      if (seen.has(key)) duplicateCount += 1;
      else seen.add(key);
      count += 1;
      lastKey = requiredString(row.key, 'key');
    }
  }
  return { count, duplicateCount };
}

async function copyDailyLogs(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ scanned: number; inserted: number }> {
  const { db } = await import('@/db');
  const { relationshipsDailyLogs } = await import('@/db/schema');
  let scanned = 0;
  let inserted = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchDailyBatch(sourceSql, lastId);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapDailyLog(row, userIdColumn, fallbackUserId));
    inserted += (await db
      .insert(relationshipsDailyLogs)
      .values(mapped)
      .onConflictDoNothing({
        target: [relationshipsDailyLogs.userId, relationshipsDailyLogs.date],
      })
      .returning({ id: relationshipsDailyLogs.id })).length;
    scanned += rows.length;
    const finalId = optionalInteger(rows[rows.length - 1].id, Number.NaN);
    if (!Number.isInteger(finalId)) throw new Error('daily_log contains a row without a numeric id.');
    lastId = finalId;
  }
  return { scanned, inserted };
}

async function copySettings(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ scanned: number; inserted: number }> {
  const { db } = await import('@/db');
  const { relationshipsSettings } = await import('@/db/schema');
  let scanned = 0;
  let inserted = 0;
  let lastKey: string | null = null;

  for (;;) {
    const rows = await fetchSettingsBatch(sourceSql, lastKey);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapSetting(row, userIdColumn, fallbackUserId));
    inserted += (await db
      .insert(relationshipsSettings)
      .values(mapped)
      .onConflictDoNothing({
        target: [relationshipsSettings.userId, relationshipsSettings.key],
      })
      .returning({ key: relationshipsSettings.key })).length;
    scanned += rows.length;
    lastKey = requiredString(rows[rows.length - 1].key, 'key');
  }
  return { scanned, inserted };
}

function redactDatabaseUrls(message: string): string {
  return message.replace(/(?:postgres(?:ql)?):\/\/[^\s"'<>]+/gi, '[database URL redacted]');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sourceUrl = process.env.RELATIONSHIPS_DATABASE_URL;
  if (!sourceUrl) throw new Error('RELATIONSHIPS_DATABASE_URL must be set.');
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
  const fallbackUserId = options.userId;
  if (options.apply && hasMissingUserId && !fallbackUserId) {
    throw new Error('Legacy tables without userId columns require --user-id with --apply.');
  }
  if (options.userId && !hasMissingUserId) {
    console.log('Legacy rows already contain userId; --user-id is not used.');
  }

  const scans = new Map<LegacyTableName, TableScan>([
    [
      'daily_log',
      await scanDailyLogs(sourceSql, userIdColumns.get('daily_log')!, fallbackUserId),
    ],
    [
      'settings',
      await scanSettings(sourceSql, userIdColumns.get('settings')!, fallbackUserId),
    ],
  ]);
  for (const [tableName, result] of scans) {
    console.log(`${tableName}: ${result.count} source row(s); ${result.duplicateCount} duplicate natural key(s).`);
  }
  if ([...scans.values()].some((result) => result.duplicateCount > 0)) {
    throw new Error('Duplicate natural keys found; no data was migrated.');
  }

  if (!options.apply) {
    console.log('Dry run only; no target rows were written.');
    if (hasMissingUserId && !options.userId) {
      console.log('Pass --user-id <Google sub> with --apply to assign legacy rows that have no userId column.');
    }
    return;
  }

  const dailyResult = await copyDailyLogs(
    sourceSql,
    userIdColumns.get('daily_log')!,
    fallbackUserId
  );
  const settingsResult = await copySettings(
    sourceSql,
    userIdColumns.get('settings')!,
    fallbackUserId
  );
  for (const [tableName, result] of [
    ['daily_log', dailyResult],
    ['settings', settingsResult],
  ] as const) {
    console.log(
      `${tableName}: scanned ${result.scanned}; inserted ${result.inserted}; already present ${result.scanned - result.inserted}.`
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? redactDatabaseUrls(error.message) : 'Unknown error';
  console.error('Relationships data migration failed:', message);
  process.exitCode = 1;
});
