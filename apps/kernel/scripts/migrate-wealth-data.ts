import 'dotenv/config';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { db } from '@/db';
import {
  wealthDebts,
  wealthGoals,
  wealthSettings,
  wealthTransactions,
  wealthZakatAssets,
  type NewWealthDebt,
  type NewWealthGoal,
  type NewWealthSetting,
  type NewWealthTransaction,
  type NewWealthZakatAsset,
} from '@/db/schema';

const BATCH_SIZE = 250;
const TABLE_NAMES = ['transactions', 'zakat_assets', 'goals', 'debts', 'settings'] as const;
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
      if (!value || value.startsWith('--') || value.trim().length === 0) {
        throw new Error('--user-id requires a Google sub value.');
      }
      userId = value.trim();
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (apply && dryRun) {
    throw new Error('Use either --apply or --dry-run, not both.');
  }
  return { apply, userId };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Legacy row has an invalid '${field}' value.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value == null ? null : requiredString(value, field);
}

function requiredNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Legacy row has an invalid '${field}' value.`);
  }
  return number;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Legacy row has an invalid '${field}' value.`);
  }
  return value;
}

function requiredDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(requiredString(value, field));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Legacy row has an invalid '${field}' value.`);
  }
  return date;
}

function rowUserId(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): string {
  if (userIdColumn) return requiredString(row[userIdColumn], userIdColumn);
  if (fallbackUserId) return fallbackUserId;
  throw new Error('Legacy tables have no userId column; pass --user-id to assign these rows.');
}

function mapTransaction(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWealthTransaction {
  return {
    id: requiredString(row.id, 'id'),
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    date: requiredString(row.date, 'date'),
    type: requiredString(row.type, 'type'),
    amount: requiredNumber(row.amount, 'amount'),
    category: requiredString(row.category, 'category'),
    subTag: requiredString(row.sub_tag, 'sub_tag'),
    halalVerified: requiredBoolean(row.halal_verified, 'halal_verified'),
    recurring: requiredBoolean(row.recurring, 'recurring'),
    linkedGoalId: nullableString(row.linked_goal_id, 'linked_goal_id'),
    notes: nullableString(row.notes, 'notes'),
    createdAt: requiredDate(row.created_at, 'created_at'),
  };
}

function mapZakatAsset(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWealthZakatAsset {
  return {
    id: requiredString(row.id, 'id'),
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    assetName: requiredString(row.asset_name, 'asset_name'),
    currentValue: requiredNumber(row.current_value, 'current_value'),
    zakatEligible: requiredBoolean(row.zakat_eligible, 'zakat_eligible'),
    nisabThreshold: requiredNumber(row.nisab_threshold, 'nisab_threshold'),
    hawlStartDate: requiredString(row.hawl_start_date, 'hawl_start_date'),
    paid: requiredBoolean(row.paid, 'paid'),
    paidDate: nullableString(row.paid_date, 'paid_date'),
  };
}

function mapGoal(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWealthGoal {
  return {
    id: requiredString(row.id, 'id'),
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    name: requiredString(row.name, 'name'),
    targetAmount: requiredNumber(row.target_amount, 'target_amount'),
    deadline: requiredString(row.deadline, 'deadline'),
    priority: requiredString(row.priority, 'priority'),
    status: requiredString(row.status, 'status'),
    createdAt: requiredDate(row.created_at, 'created_at'),
  };
}

function mapDebt(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWealthDebt {
  return {
    id: requiredString(row.id, 'id'),
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    lender: requiredString(row.lender, 'lender'),
    totalAmount: requiredNumber(row.total_amount, 'total_amount'),
    payoffDeadline: nullableString(row.payoff_deadline, 'payoff_deadline'),
    monthlyCommitment: requiredNumber(row.monthly_commitment, 'monthly_commitment'),
    createdAt: requiredDate(row.created_at, 'created_at'),
  };
}

function mapSetting(
  row: LegacyRow,
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null
): NewWealthSetting {
  return {
    userId: rowUserId(row, userIdColumn, fallbackUserId),
    key: requiredString(row.key, 'key'),
    value: requiredString(row.value, 'value'),
    updatedAt: requiredDate(row.updated_at, 'updated_at'),
  };
}

async function readColumns(
  sourceSql: SourceSql
): Promise<Map<LegacyTableName, Set<string>>> {
  const placeholders = TABLE_NAMES.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await sourceSql(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name IN (${placeholders})`,
    [...TABLE_NAMES]
  );
  const columns = new Map<LegacyTableName, Set<string>>(
    TABLE_NAMES.map((tableName) => [tableName, new Set<string>()])
  );
  for (const row of rows) {
    const tableName = requiredString(row.table_name, 'table_name');
    if (TABLE_NAMES.includes(tableName as LegacyTableName)) {
      columns.get(tableName as LegacyTableName)?.add(requiredString(row.column_name, 'column_name'));
    }
  }
  return columns;
}

function getUserIdColumn(columns: Set<string>, tableName: string): UserIdColumn {
  if (columns.has('user_id')) return 'user_id';
  if (columns.has('userId')) return 'userId';
  if ([...columns].some((column) => column.toLowerCase() === 'userid')) {
    throw new Error(`${tableName} has an unsupported userId column name.`);
  }
  return null;
}

async function countRows(
  sourceSql: SourceSql,
  tableName: LegacyTableName
): Promise<number> {
  const rows = await sourceSql(
    `SELECT COUNT(*) AS count FROM "${tableName}"`
  );
  return requiredNumber(rows[0]?.count, `${tableName} count`);
}

async function copyBatches<T>(
  sourceSql: SourceSql,
  tableName: LegacyTableName,
  keyColumn: 'id' | 'key',
  userIdColumn: UserIdColumn,
  fallbackUserId: string | null,
  mapRow: (row: LegacyRow, userIdColumn: UserIdColumn, fallbackUserId: string | null) => T,
  insertRows: (rows: T[]) => Promise<number>
): Promise<{ scanned: number; inserted: number }> {
  let lastKey: string | null = null;
  let scanned = 0;
  let inserted = 0;

  for (;;) {
    const rows: LegacyRow[] = lastKey === null
      ? await sourceSql(
          `SELECT * FROM "${tableName}" ORDER BY "${keyColumn}" LIMIT $1`,
          [BATCH_SIZE]
        )
      : await sourceSql(
          `SELECT * FROM "${tableName}" WHERE "${keyColumn}" > $1 ORDER BY "${keyColumn}" LIMIT $2`,
          [lastKey, BATCH_SIZE]
        );
    if (rows.length === 0) break;

    const mapped = rows.map((row) => mapRow(row, userIdColumn, fallbackUserId));
    inserted += await insertRows(mapped);
    scanned += rows.length;
    lastKey = requiredString(rows[rows.length - 1][keyColumn], keyColumn);
  }

  return { scanned, inserted };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sourceUrl = process.env.WEALTH_DATABASE_URL;
  if (!sourceUrl) throw new Error('WEALTH_DATABASE_URL must be set.');
  if (options.apply && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set to apply rows to Kernel.');
  }

  const sourceSql: SourceSql = neon(sourceUrl);
  const columnMap = await readColumns(sourceSql);
  for (const tableName of TABLE_NAMES) {
    if (columnMap.get(tableName)?.size === 0) {
      throw new Error(`Legacy table '${tableName}' was not found in the source database.`);
    }
  }

  const userIdColumns = new Map(
    TABLE_NAMES.map((tableName) => [
      tableName,
      getUserIdColumn(columnMap.get(tableName)!, tableName),
    ])
  );
  const tablesHaveUserId = TABLE_NAMES.map((tableName) => userIdColumns.get(tableName) !== null);
  const sourceHasUserId = tablesHaveUserId.every(Boolean);
  if (!sourceHasUserId && tablesHaveUserId.some(Boolean)) {
    throw new Error('Legacy tables have inconsistent userId columns; refusing ambiguous migration.');
  }
  if (sourceHasUserId && options.userId) {
    console.log('Source already has userId columns; the --user-id value will be ignored.');
  }
  if (!sourceHasUserId && options.apply && !options.userId) {
    throw new Error('Legacy rows have no userId column; --user-id is required with --apply.');
  }

  if (!options.apply) {
    console.log('Dry run: source rows will be counted; no data will be written.');
    if (!sourceHasUserId && !options.userId) {
      console.log('To apply this legacy single-user dataset, provide --user-id <Google sub>.');
    }
    for (const tableName of TABLE_NAMES) {
      const count = await countRows(sourceSql, tableName);
      console.log(`${tableName}: ${count} source row(s); ${count} would be processed.`);
    }
    return;
  }

  let totalScanned = 0;
  let totalInserted = 0;
  const fallbackUserId = sourceHasUserId ? null : options.userId;

  const results = [
    await copyBatches(
      sourceSql, 'transactions', 'id', userIdColumns.get('transactions')!, fallbackUserId, mapTransaction,
      async (rows) => (await db.insert(wealthTransactions).values(rows)
        .onConflictDoNothing({
          target: [wealthTransactions.userId, wealthTransactions.id],
        })
        .returning({ id: wealthTransactions.id })).length
    ),
    await copyBatches(
      sourceSql, 'zakat_assets', 'id', userIdColumns.get('zakat_assets')!, fallbackUserId, mapZakatAsset,
      async (rows) => (await db.insert(wealthZakatAssets).values(rows)
        .onConflictDoNothing({
          target: [wealthZakatAssets.userId, wealthZakatAssets.id],
        })
        .returning({ id: wealthZakatAssets.id })).length
    ),
    await copyBatches(
      sourceSql, 'goals', 'id', userIdColumns.get('goals')!, fallbackUserId, mapGoal,
      async (rows) => (await db.insert(wealthGoals).values(rows)
        .onConflictDoNothing({
          target: [wealthGoals.userId, wealthGoals.id],
        })
        .returning({ id: wealthGoals.id })).length
    ),
    await copyBatches(
      sourceSql, 'debts', 'id', userIdColumns.get('debts')!, fallbackUserId, mapDebt,
      async (rows) => (await db.insert(wealthDebts).values(rows)
        .onConflictDoNothing({
          target: [wealthDebts.userId, wealthDebts.id],
        })
        .returning({ id: wealthDebts.id })).length
    ),
    await copyBatches(
      sourceSql, 'settings', 'key', userIdColumns.get('settings')!, fallbackUserId, mapSetting,
      async (rows) => (await db.insert(wealthSettings).values(rows)
        .onConflictDoNothing({
          target: [wealthSettings.userId, wealthSettings.key],
        })
        .returning({ key: wealthSettings.key })).length
    ),
  ];

  TABLE_NAMES.forEach((tableName, index) => {
    const result = results[index];
    totalScanned += result.scanned;
    totalInserted += result.inserted;
    console.log(
      `${tableName}: scanned ${result.scanned}; inserted ${result.inserted}; already present ${result.scanned - result.inserted}.`
    );
  });
  console.log(`Total: scanned ${totalScanned}; inserted ${totalInserted}; existing ${totalScanned - totalInserted}.`);
}

main().catch((error: unknown) => {
  console.error('Wealth data migration failed:', error);
  process.exitCode = 1;
});
