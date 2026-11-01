import { createHash, randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  type NewRoadmapGoal,
  type NewRoadmapImportBatch,
  type NewRoadmapMilestone,
  type NewRoadmapTask,
  roadmapGoals,
  roadmapImportBatches,
  roadmapMilestones,
  roadmapTasks,
} from '@/db/schema';
import { parseRoadmapCsv, MAX_CSV_BYTES } from '@/lib/roadmap/csv';
import { findImportedHash, getImportBatch } from '@/lib/roadmap/repo';
import type { RoadmapCsvPreview, RoadmapCsvRow } from '@/lib/roadmap/types';

const INSERT_BATCH_SIZE = 250;
type DuplicateWarning = Awaited<ReturnType<typeof findImportedHash>> | null;

type BatchInsert = Omit<NewRoadmapImportBatch, 'id' | 'status'> & {
  id: string;
  status: 'pending';
};
type GoalInsert = Omit<NewRoadmapGoal, 'id' | 'status' | 'source' | 'importBatchId'> & {
  id: string;
  status: 'active';
  source: 'csv';
  importBatchId: string;
};
type MilestoneInsert = Omit<
  NewRoadmapMilestone,
  'id' | 'goalId' | 'status' | 'source' | 'importBatchId'
> & {
  id: string;
  goalId: string;
  status: 'active';
  source: 'csv';
  importBatchId: string;
};
type TaskInsert = Omit<
  NewRoadmapTask,
  'id' | 'goalId' | 'milestoneId' | 'status' | 'source' | 'importBatchId'
> & {
  id: string;
  goalId: string | null;
  milestoneId: string | null;
  status: 'todo';
  source: 'csv';
  importBatchId: string;
};

export interface RoadmapImportStore {
  createPendingBatch(batch: BatchInsert): Promise<void>;
  getBatch(userId: string, batchId: string): Promise<{ status: string; contentHash: string } | null>;
  claimBatch(userId: string, batchId: string): Promise<boolean>;
  insertGoals(rows: GoalInsert[]): Promise<void>;
  insertMilestones(rows: MilestoneInsert[]): Promise<void>;
  insertTasks(rows: TaskInsert[]): Promise<void>;
  markDone(userId: string, batchId: string): Promise<void>;
  markFailed(userId: string, batchId: string): Promise<void>;
}

export interface RoadmapPreview {
  batchId: string;
  filename: string;
  preview: RoadmapCsvPreview;
  duplicate: DuplicateWarning;
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? '';
  return basename.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
}

export function parseUpload(
  bytes: Uint8Array,
  filename: string
): { filename: string; contentHash: string; preview: RoadmapCsvPreview } {
  if (bytes.byteLength > MAX_CSV_BYTES) throw new Error('CSV file exceeds the 1 MB limit.');
  const cleanFilename = sanitizeFilename(filename);
  if (!cleanFilename || cleanFilename.length > 255) {
    throw new Error('Filename must be between 1 and 255 characters.');
  }
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const preview = parseRoadmapCsv(bytes);
  return { filename: cleanFilename, contentHash, preview };
}

export async function buildPreview(
  userId: string,
  parsed: ReturnType<typeof parseUpload>,
  lookupDuplicate: (
    userId: string,
    contentHash: string
  ) => Promise<DuplicateWarning> = findImportedHash
): Promise<RoadmapPreview> {
  const duplicate = await lookupDuplicate(userId, parsed.contentHash);
  return {
    batchId: randomUUID(),
    filename: parsed.filename,
    preview: parsed.preview,
    duplicate,
  };
}

function chunks<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += INSERT_BATCH_SIZE) {
    result.push(values.slice(index, index + INSERT_BATCH_SIZE));
  }
  return result;
}

async function insertGoals(
  userId: string,
  batchId: string,
  rows: RoadmapCsvRow[],
  idsByRow: Map<number, string>,
  insert: RoadmapImportStore['insertGoals']
): Promise<void> {
  for (const row of rows.filter((entry) => entry.type === 'goal' && entry.issues.length === 0)) {
    idsByRow.set(row.rowNumber, randomUUID());
  }
  const values = rows
    .filter((row) => row.type === 'goal' && row.issues.length === 0)
    .map((row) => ({
      id: idsByRow.get(row.rowNumber)!,
      userId,
      title: row.title,
      description: row.description,
      domain: row.domain,
      priority: row.priority,
      status: 'active' as const,
      startDate: row.startDate,
      dueDate: row.dueDate,
      source: 'csv' as const,
      importBatchId: batchId,
    }));
  for (const part of chunks(values)) {
    await insert(part);
  }
}

async function insertMilestones(
  userId: string,
  batchId: string,
  rows: RoadmapCsvRow[],
  goalIdsByRow: Map<number, string>,
  idsByRow: Map<number, string>,
  insert: RoadmapImportStore['insertMilestones']
): Promise<void> {
  const milestones = rows.filter(
    (row) => row.type === 'milestone' && row.issues.length === 0
  );
  for (const row of milestones) idsByRow.set(row.rowNumber, randomUUID());
  const values = milestones.map((row) => ({
    id: idsByRow.get(row.rowNumber)!,
    userId,
    goalId: goalIdsByRow.get(row.goalParentRow!)!,
    title: row.title,
    description: row.description,
    domain: row.domain,
    priority: row.priority,
    status: 'active' as const,
    startDate: row.startDate,
    dueDate: row.dueDate,
    source: 'csv' as const,
    importBatchId: batchId,
  }));
  for (const part of chunks(values)) {
    await insert(part);
  }
}

async function insertTasks(
  userId: string,
  batchId: string,
  rows: RoadmapCsvRow[],
  goalIdsByRow: Map<number, string>,
  milestoneIdsByRow: Map<number, string>,
  insert: RoadmapImportStore['insertTasks']
): Promise<void> {
  const values = rows
    .filter((row) => row.type === 'task' && row.issues.length === 0)
    .map((row) => ({
      id: randomUUID(),
      userId,
      goalId: row.goalParentRow === null ? null : goalIdsByRow.get(row.goalParentRow)!,
      milestoneId: row.milestoneParentRow === null
        ? null
        : milestoneIdsByRow.get(row.milestoneParentRow)!,
      title: row.title,
      description: row.description,
      domain: row.domain,
      priority: row.priority,
      status: 'todo' as const,
      startDate: row.startDate,
      dueDate: row.dueDate,
      estimateMinutes: row.estimateMinutes,
      source: 'csv' as const,
      importBatchId: batchId,
    }));
  for (const part of chunks(values)) {
    await insert(part);
  }
}

const databaseImportStore: RoadmapImportStore = {
  async createPendingBatch(batch) {
    await db.insert(roadmapImportBatches).values(batch).onConflictDoNothing({
      target: [roadmapImportBatches.userId, roadmapImportBatches.id],
    });
  },
  async getBatch(userId, batchId) {
    const batch = await getImportBatch(userId, batchId);
    return batch ? { status: batch.status, contentHash: batch.contentHash } : null;
  },
  async claimBatch(userId, batchId) {
    const [claimed] = await db.update(roadmapImportBatches)
      .set({ confirmStartedAt: new Date() })
      .where(and(
        eq(roadmapImportBatches.userId, userId),
        eq(roadmapImportBatches.id, batchId),
        eq(roadmapImportBatches.status, 'pending'),
        isNull(roadmapImportBatches.confirmStartedAt)
      ))
      .returning({ id: roadmapImportBatches.id });
    return Boolean(claimed);
  },
  async insertGoals(rows) {
    await db.insert(roadmapGoals).values(rows);
  },
  async insertMilestones(rows) {
    await db.insert(roadmapMilestones).values(rows);
  },
  async insertTasks(rows) {
    await db.insert(roadmapTasks).values(rows);
  },
  async markDone(userId, batchId) {
    const [updated] = await db.update(roadmapImportBatches).set({
      status: 'done',
      completedAt: new Date(),
    }).where(and(
      eq(roadmapImportBatches.userId, userId),
      eq(roadmapImportBatches.id, batchId),
      eq(roadmapImportBatches.status, 'pending')
    )).returning({ id: roadmapImportBatches.id });
    if (!updated) throw new Error('Pending import batch could not be marked done.');
  },
  async markFailed(userId, batchId) {
    await db.update(roadmapImportBatches).set({
      status: 'failed',
      completedAt: new Date(),
    }).where(and(
      eq(roadmapImportBatches.userId, userId),
      eq(roadmapImportBatches.id, batchId),
      eq(roadmapImportBatches.status, 'pending')
    ));
  },
};

export async function prepareImportPreview(
  userId: string,
  parsed: ReturnType<typeof parseUpload>
): Promise<RoadmapPreview> {
  const preview = await buildPreview(userId, parsed);
  await databaseImportStore.createPendingBatch({
    id: preview.batchId,
    userId,
    filename: parsed.filename,
    contentHash: parsed.contentHash,
    status: 'pending',
    rowCount: parsed.preview.rows.length,
    goalCount: parsed.preview.importableCounts.goal,
    milestoneCount: parsed.preview.importableCounts.milestone,
    taskCount: parsed.preview.importableCounts.task,
    skippedCount: parsed.preview.skippedCount,
    errorCount: parsed.preview.errors.length,
  });
  return preview;
}

export async function confirmImport(
  userId: string,
  batchId: string,
  bytes: Uint8Array,
  filename: string,
  store: RoadmapImportStore = databaseImportStore
): Promise<
  | { kind: 'conflict'; status: string }
  | { kind: 'success'; counts: { goals: number; milestones: number; tasks: number; skipped: number } }
> {
  const parsed = parseUpload(bytes, filename);
  const { preview } = parsed;
  const batch = await store.getBatch(userId, batchId);
  if (!batch) throw new Error('Import preview batch was not found.');
  if (parsed.contentHash !== batch.contentHash) {
    throw new Error('Uploaded file does not match the previewed file.');
  }
  if (batch.status !== 'pending') {
    return { kind: 'conflict', status: batch.status };
  }

  if (!(await store.claimBatch(userId, batchId))) {
    const current = await store.getBatch(userId, batchId);
    return { kind: 'conflict', status: current?.status ?? 'unknown' };
  }

  const goalIdsByRow = new Map<number, string>();
  const milestoneIdsByRow = new Map<number, string>();
  try {
    await insertGoals(userId, batchId, preview.rows, goalIdsByRow, store.insertGoals);
    await insertMilestones(
      userId,
      batchId,
      preview.rows,
      goalIdsByRow,
      milestoneIdsByRow,
      store.insertMilestones
    );
    await insertTasks(userId, batchId, preview.rows, goalIdsByRow, milestoneIdsByRow, store.insertTasks);
    await store.markDone(userId, batchId);
  } catch {
    try {
      await store.markFailed(userId, batchId);
    } catch {
      console.error(`Roadmap import batch ${batchId} could not be marked failed.`);
    }
    console.error(`Roadmap import batch ${batchId} failed while inserting rows.`);
    throw new Error('Import failed after starting. The batch is marked failed when possible and can be deleted.');
  }

  return {
    kind: 'success',
    counts: {
      goals: preview.importableCounts.goal,
      milestones: preview.importableCounts.milestone,
      tasks: preview.importableCounts.task,
      skipped: preview.skippedCount,
    },
  };
}
