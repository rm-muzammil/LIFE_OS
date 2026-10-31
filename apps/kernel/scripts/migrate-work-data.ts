// Run from apps/kernel. `dotenv/config` reads apps/kernel/.env (not .env.local).
import 'dotenv/config';
import { createHash } from 'crypto';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { NewWorkDailyLog, NewWorkProject } from '@/db/schema';

const BATCH_SIZE = 250;
const TABLE_NAMES = ['projects', 'daily_log'] as const;
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

function requiredInteger(value: unknown, name: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Legacy data has an invalid '${name}' value.`);
  }
  return parsed;
}

function optionalInteger(value: unknown, name: string, fallback = 0): number {
  if (value == null) return fallback;
  return requiredInteger(value, name);
}

function requiredNumber(value: unknown, name: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Legacy data has an invalid '${name}' value.`);
  return parsed;
}

function optionalText(value: unknown, name: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error(`Legacy data has an invalid '${name}' value.`);
  return value;
}

function requiredDate(value: unknown, name: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const date = requiredString(value, name);
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(date);
  if (!match) throw new Error(`Legacy data has an invalid '${name}' value.`);
  return match[1];
}

function optionalDate(value: unknown, name: string): string | null {
  if (value == null) return null;
  return requiredDate(value, name);
}

function optionalDateTime(value: unknown, name: string): Date | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(requiredString(value, name));
  if (Number.isNaN(date.getTime())) throw new Error(`Legacy data has an invalid '${name}' value.`);
  return date;
}

function optionalBoolean(value: unknown, name: string): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0') return false;
  if (value === 1 || value === '1') return true;
  throw new Error(`Legacy data has an invalid '${name}' value.`);
}

function requiredStatus(value: unknown): 'active' | 'paused' | 'completed' {
  if (value === 'active' || value === 'paused' || value === 'completed') return value;
  throw new Error('Legacy project has an unsupported status.');
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
  if (!userId) throw new Error('Legacy tables have no userId column; pass --user-id to assign these rows.');
  return userId;
}

function findUserIdColumn(columns: Set<string>, tableName: string): UserIdColumn {
  if (columns.has('user_id')) return 'user_id';
  if (columns.has('userId')) return 'userId';
  if ([...columns].some((column) => column.toLowerCase() === 'userid')) {
    throw new Error(`${tableName} has an unsupported userId column name.`);
  }
  return null;
}

function mappedProjectId(userId: string, legacyProjectId: number): string {
  const digest = createHash('sha1')
    .update(`work-project:${userId}\u0000${legacyProjectId}`)
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapProject(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWorkProject {
  const userId = requiredUserId(row, userIdColumn, fallbackUserId);
  const legacyId = requiredInteger(row.id, 'project id');
  return {
    id: mappedProjectId(userId, legacyId),
    userId,
    name: requiredString(row.name, 'project name'),
    description: optionalText(row.description, 'project description'),
    status: requiredStatus(row.status),
    targetDate: optionalDate(field(row, 'target_date', 'targetDate'), 'target date'),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt'), 'project creation timestamp'),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt'), 'project update timestamp'),
  };
}

function mapDailyLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  projectOwners: Map<number, string | null>
): NewWorkDailyLog {
  const userId = requiredUserId(row, userIdColumn, fallbackUserId);
  const legacyProjectId =
    row.project_id == null ? null : requiredInteger(row.project_id, 'project reference');
  let projectId: string | null = null;
  if (legacyProjectId !== null) {
    const projectOwner = projectOwners.get(legacyProjectId);
    if (projectOwner === undefined) {
      throw new Error('Legacy daily log references a project that does not exist.');
    }
    if (projectOwner !== null && projectOwner !== userId) {
      throw new Error('Legacy daily log references a project owned by another user.');
    }
    projectId = mappedProjectId(userId, legacyProjectId);
  }

  return {
    userId,
    logDate: requiredDate(field(row, 'log_date', 'logDate'), 'log date'),
    deepWorkHours: requiredNumber(field(row, 'deep_work_hours', 'deepWorkHours'), 'deep work hours'),
    tasksCompleted: optionalInteger(field(row, 'tasks_completed', 'tasksCompleted'), 'tasks completed'),
    milestoneDone: optionalBoolean(field(row, 'milestone_done', 'milestoneDone'), 'milestone status'),
    profDevMinutes: optionalInteger(field(row, 'prof_dev_minutes', 'profDevMinutes'), 'professional development minutes'),
    noProcrastination: optionalBoolean(field(row, 'no_procrastination', 'noProcrastination'), 'procrastination status'),
    clientDeliverable: optionalBoolean(field(row, 'client_deliverable', 'clientDeliverable'), 'deliverable status'),
    projectId,
    notes: optionalText(row.notes, 'log notes'),
    score: optionalInteger(row.score, 'score'),
    createdAt: optionalDateTime(field(row, 'created_at', 'createdAt'), 'log creation timestamp'),
    updatedAt: optionalDateTime(field(row, 'updated_at', 'updatedAt'), 'log update timestamp'),
  };
}

function validateDailyLog(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  projectOwners: Map<number, string | null>
): void {
  const userId = resolveUserId(row, userIdColumn, fallbackUserId);
  const legacyProjectId =
    row.project_id == null ? null : requiredInteger(row.project_id, 'project reference');
  if (legacyProjectId !== null) {
    const projectOwner = projectOwners.get(legacyProjectId);
    if (projectOwner === undefined) {
      throw new Error('Legacy daily log references a project that does not exist.');
    }
    if (userId && projectOwner && projectOwner !== userId) {
      throw new Error('Legacy daily log references a project owned by another user.');
    }
  }
  requiredDate(field(row, 'log_date', 'logDate'), 'log date');
  requiredNumber(field(row, 'deep_work_hours', 'deepWorkHours'), 'deep work hours');
  optionalInteger(field(row, 'tasks_completed', 'tasksCompleted'), 'tasks completed');
  optionalBoolean(field(row, 'milestone_done', 'milestoneDone'), 'milestone status');
  optionalInteger(field(row, 'prof_dev_minutes', 'profDevMinutes'), 'professional development minutes');
  optionalBoolean(field(row, 'no_procrastination', 'noProcrastination'), 'procrastination status');
  optionalBoolean(field(row, 'client_deliverable', 'clientDeliverable'), 'deliverable status');
  optionalText(row.notes, 'log notes');
  optionalInteger(row.score, 'score');
  optionalDateTime(field(row, 'created_at', 'createdAt'), 'log creation timestamp');
  optionalDateTime(field(row, 'updated_at', 'updatedAt'), 'log update timestamp');
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

function projectNaturalKey(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): string {
  return `${resolveUserId(row, userIdColumn, fallbackUserId) ?? ''}\u0000${requiredInteger(row.id, 'project id')}`;
}

function logNaturalKey(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): string {
  return `${resolveUserId(row, userIdColumn, fallbackUserId) ?? ''}\u0000${requiredDate(
    field(row, 'log_date', 'logDate'),
    'log date'
  )}`;
}

async function scanProjects(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ result: TableScan; projectOwners: Map<number, string | null> }> {
  const seen = new Set<string>();
  const projectOwners = new Map<number, string | null>();
  let count = 0;
  let duplicateCount = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'projects', lastId);
    if (rows.length === 0) break;
    for (const row of rows) {
      const id = requiredInteger(row.id, 'project id');
      const key = projectNaturalKey(row, userIdColumn, fallbackUserId);
      if (seen.has(key)) duplicateCount += 1;
      else seen.add(key);
      projectOwners.set(id, resolveUserId(row, userIdColumn, fallbackUserId));
      count += 1;
      lastId = id;
    }
  }
  return { result: { count, duplicateCount }, projectOwners };
}

async function scanDailyLogs(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  projectOwners: Map<number, string | null>
): Promise<TableScan> {
  const seen = new Set<string>();
  let count = 0;
  let duplicateCount = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'daily_log', lastId);
    if (rows.length === 0) break;
    for (const row of rows) {
      const key = logNaturalKey(row, userIdColumn, fallbackUserId);
      if (seen.has(key)) duplicateCount += 1;
      else seen.add(key);
      validateDailyLog(row, userIdColumn, fallbackUserId, projectOwners);
      count += 1;
      lastId = requiredInteger(row.id, 'daily log id');
    }
  }
  return { count, duplicateCount };
}

async function copyProjects(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): Promise<{ scanned: number; inserted: number }> {
  const { db } = await import('@/db');
  const { workProjects } = await import('@/db/schema');
  let scanned = 0;
  let inserted = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'projects', lastId);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapProject(row, userIdColumn, fallbackUserId));
    inserted += (await db
      .insert(workProjects)
      .values(mapped)
      .onConflictDoNothing({ target: [workProjects.userId, workProjects.id] })
      .returning({ id: workProjects.id })).length;
    scanned += rows.length;
    lastId = requiredInteger(rows[rows.length - 1].id, 'project id');
  }
  return { scanned, inserted };
}

async function copyDailyLogs(
  sourceSql: SourceSql,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  projectOwners: Map<number, string | null>
): Promise<{ scanned: number; inserted: number }> {
  const { db } = await import('@/db');
  const { workDailyLogs } = await import('@/db/schema');
  let scanned = 0;
  let inserted = 0;
  let lastId: number | null = null;

  for (;;) {
    const rows = await fetchBatch(sourceSql, 'daily_log', lastId);
    if (rows.length === 0) break;
    const mapped = rows.map((row) => mapDailyLog(row, userIdColumn, fallbackUserId, projectOwners));
    inserted += (await db
      .insert(workDailyLogs)
      .values(mapped)
      .onConflictDoNothing({
        target: [workDailyLogs.userId, workDailyLogs.logDate],
      })
      .returning({ id: workDailyLogs.id })).length;
    scanned += rows.length;
    lastId = requiredInteger(rows[rows.length - 1].id, 'daily log id');
  }
  return { scanned, inserted };
}

function redactDatabaseUrls(message: string): string {
  return message.replace(/(?:postgres(?:ql)?):\/\/[^\s"'<>]+/gi, '[database URL redacted]');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sourceUrl = process.env.WORK_DATABASE_URL;
  if (!sourceUrl) throw new Error('WORK_DATABASE_URL must be set.');
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
    console.log('Legacy rows already contain userId; --user-id is not used.');
  }
  if (!sourceHasUserId && options.apply && !options.userId) {
    throw new Error('Legacy tables have no userId column; --user-id is required with --apply.');
  }
  const fallbackUserId = sourceHasUserId ? null : options.userId;

  const { result: projectScan, projectOwners } = await scanProjects(
    sourceSql,
    userIdColumns.get('projects')!,
    fallbackUserId
  );
  const dailyLogScan = await scanDailyLogs(
    sourceSql,
    userIdColumns.get('daily_log')!,
    fallbackUserId,
    projectOwners
  );
  for (const [tableName, result] of [
    ['projects', projectScan],
    ['daily_log', dailyLogScan],
  ] as const) {
    console.log(`${tableName}: ${result.count} source row(s); ${result.duplicateCount} duplicate natural key(s).`);
  }
  if (projectScan.duplicateCount > 0 || dailyLogScan.duplicateCount > 0) {
    throw new Error('Duplicate natural keys found; no data was migrated.');
  }

  if (!options.apply) {
    console.log('Dry run only; no target rows were written.');
    if (!sourceHasUserId && !options.userId) {
      console.log('Pass --user-id YOUR_GOOGLE_SUB with --apply to assign legacy single-user rows.');
    }
    console.log('The legacy settings row contains only SK sync state and is not copied.');
    return;
  }

  const projects = await copyProjects(sourceSql, userIdColumns.get('projects')!, fallbackUserId);
  const dailyLogs = await copyDailyLogs(
    sourceSql,
    userIdColumns.get('daily_log')!,
    fallbackUserId,
    projectOwners
  );
  for (const [tableName, result] of [
    ['projects', projects],
    ['daily_log', dailyLogs],
  ] as const) {
    console.log(
      `${tableName}: scanned ${result.scanned}; inserted ${result.inserted}; already present ${result.scanned - result.inserted}.`
    );
  }
  console.log('Legacy settings: skipped (SK sync configuration only).');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? redactDatabaseUrls(error.message) : 'Unknown error';
  console.error('Work data migration failed:', message);
  process.exitCode = 1;
});
