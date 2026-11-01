import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildPreview, confirmImport, parseUpload, type RoadmapImportStore } from '@/lib/roadmap/import';
import { ROADMAP_CSV_TEMPLATE } from '@/lib/roadmap/template';

async function main() {
  const userId = randomUUID();
  const bytes = new TextEncoder().encode(ROADMAP_CSV_TEMPLATE);
  const parsed = parseUpload(bytes, 'roadmap-template.csv');
  const preview = await buildPreview(userId, parsed, async () => null);
  assert.deepEqual(preview.preview.counts, { goal: 1, milestone: 1, task: 1 });
  assert.deepEqual(preview.preview.importableCounts, { goal: 1, milestone: 1, task: 1 });
  assert.equal(preview.preview.errors.length, 0);

  const statuses = new Map<string, string>();
  const claimed = new Set<string>();
  const goals: Array<{ id: string; title: string }> = [];
  const milestones: Array<{ id: string; goalId: string; title: string }> = [];
  const tasks: Array<{ goalId: string | null; milestoneId: string | null; title: string }> = [];
  const store: RoadmapImportStore = {
    async createPendingBatch(batch) {
      if (!statuses.has(batch.id)) statuses.set(batch.id, batch.status);
    },
    async getBatchStatus(_userId, batchId) {
      return statuses.get(batchId) ?? null;
    },
    async claimBatch(_userId, batchId) {
      if (statuses.get(batchId) !== 'pending' || claimed.has(batchId)) return false;
      claimed.add(batchId);
      return true;
    },
    async insertGoals(rows) {
      goals.push(...rows.map(({ id, title }) => ({ id, title })));
    },
    async insertMilestones(rows) {
      milestones.push(...rows.map(({ id, goalId, title }) => ({ id, goalId, title })));
    },
    async insertTasks(rows) {
      tasks.push(...rows.map(({ goalId, milestoneId, title }) => ({
        goalId,
        milestoneId,
        title,
      })));
    },
    async markDone(_userId, batchId) {
      statuses.set(batchId, 'done');
    },
    async markFailed(_userId, batchId) {
      statuses.set(batchId, 'failed');
    },
  };

  const confirmed = await confirmImport(
    userId,
    preview.batchId,
    preview.contentHash,
    bytes,
    preview.filename,
    store
  );
  assert.deepEqual(confirmed, {
    kind: 'success',
    counts: { goals: 1, milestones: 1, tasks: 1, skipped: 0 },
  });
  assert.equal(statuses.get(preview.batchId), 'done');
  assert.equal(milestones[0].goalId, goals[0].id);
  assert.equal(tasks[0].goalId, goals[0].id);
  assert.equal(tasks[0].milestoneId, milestones[0].id);

  const invalidParentCsv = [
    'type,title,parent,domain,start_date,due_date,priority,estimate_minutes,notes',
    `goal,Skipped Goal,,,,,,,${'x'.repeat(4001)}`,
    'milestone,Skipped Milestone,Skipped Goal,,,,,,',
    'task,Orphan Task,Skipped Milestone,,,,,,',
  ].join('\n');
  const invalidPreview = parseUpload(
    new TextEncoder().encode(invalidParentCsv),
    'invalid-parent.csv'
  ).preview;
  assert.equal(invalidPreview.importableCounts.goal, 0);
  assert.equal(invalidPreview.importableCounts.milestone, 0);
  assert.equal(invalidPreview.importableCounts.task, 0);
  assert.deepEqual(
    invalidPreview.errors.filter((error) => error.reason === 'parent skipped')
      .map((error) => error.row),
    [3, 4]
  );
  assert.ok(invalidPreview.errors.every((error) => !('value' in error)));

  const repeated = await confirmImport(
    userId,
    preview.batchId,
    preview.contentHash,
    bytes,
    preview.filename,
    store
  );
  assert.deepEqual(repeated, { kind: 'conflict', status: 'done' });
  console.log('Roadmap CSV template preview: 1 goal, 1 milestone, 1 task; 0 errors.');
  console.log('Roadmap CSV confirm: 3 rows linked correctly; duplicate confirmation refused; no database used.');
  console.log('Roadmap CSV validation: invalid parent and descendants skipped with static errors.');
}

main().catch((error: unknown) => {
  console.error('Roadmap import verification failed:', error);
  process.exitCode = 1;
});
