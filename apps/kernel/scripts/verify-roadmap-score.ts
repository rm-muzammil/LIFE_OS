import assert from 'node:assert/strict';
import { calculateRoadmapScore, type RoadmapScoreInput } from '@/lib/roadmap/score';

const today = '2026-03-15';
const updatedAt = '2026-03-15T12:00:00.000Z';

function score(input: Partial<RoadmapScoreInput> = {}) {
  return calculateRoadmapScore({
    today,
    tasks: [],
    goals: [],
    milestones: [],
    updatedAt,
    ...input,
  });
}

const empty = score();
assert.equal(empty.score, 0);
assert.equal(empty.details.empty, true);

const windowTasks = score({
  tasks: [
    { status: 'done', dueDate: '2026-03-14', completedAt: new Date('2026-03-15T00:00:00Z') },
    { status: 'todo', dueDate: '2026-03-14', completedAt: null },
  ],
});
assert.equal(windowTasks.scoreBreakdown.completion, 25);
assert.equal(windowTasks.streak, 1);
assert.equal(windowTasks.details.todayTotal, 1);
assert.equal(windowTasks.details.empty, false);

const oldOverdue = score({
  tasks: [{ status: 'todo', dueDate: '2026-02-28', completedAt: null }],
});
assert.equal(oldOverdue.scoreBreakdown.completion, 0);
assert.equal(oldOverdue.scoreBreakdown.overdueControl, 0);
assert.equal(oldOverdue.details.todayTotal, 1);

const yesterdayStreak = score({
  tasks: [
    { status: 'done', dueDate: null, completedAt: new Date('2026-03-14T08:00:00Z') },
    { status: 'done', dueDate: null, completedAt: new Date('2026-03-13T08:00:00Z') },
  ],
});
assert.equal(yesterdayStreak.streak, 2);

const suggestedOnly = score({
  tasks: [{ status: 'suggested', dueDate: today, completedAt: null }],
});
assert.equal(suggestedOnly.score, 0);
assert.equal(suggestedOnly.details.empty, true);

const pausedMilestones = score({
  tasks: [{ status: 'todo', dueDate: today, completedAt: null }],
  goals: [
    { id: 'active-goal', status: 'active' },
    { id: 'paused-goal', status: 'paused' },
  ],
  milestones: [
    { goalId: 'active-goal', status: 'paused' },
    { goalId: 'paused-goal', status: 'active' },
  ],
});
assert.equal(pausedMilestones.scoreBreakdown.milestoneProgress, 20);

const pktBoundary = score({
  tasks: [{
    status: 'done',
    dueDate: null,
    completedAt: new Date('2026-03-14T19:00:00.000Z'),
  }],
});
assert.equal(pktBoundary.scoreBreakdown.completion, 50);
assert.equal(pktBoundary.streak, 1);

console.log('Roadmap scoring verification passed: empty, 14-day window, old overdue, yesterday streak, suggested exclusion, paused milestones, and PKT date boundary.');
