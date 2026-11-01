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
assert.equal(pausedMilestones.scoreBreakdown.milestoneProgress, 0);

const pktBoundary = score({
  tasks: [{
    status: 'done',
    dueDate: null,
    completedAt: new Date('2026-03-14T19:00:00.000Z'),
  }],
});
assert.equal(pktBoundary.scoreBreakdown.completion, 50);
assert.equal(pktBoundary.streak, 1);

const futureOnly = score({
  tasks: [{ status: 'todo', dueDate: '2026-03-16', completedAt: null }],
});
assert.equal(futureOnly.scoreBreakdown.completion, 0);
assert.equal(futureOnly.scoreBreakdown.overdueControl, 0);
assert.equal(futureOnly.scoreBreakdown.milestoneProgress, 0);
assert.equal(futureOnly.score, 0);
console.log(`Fixture (a) future-only roadmap, nothing done: score ${futureOnly.score}.`);

const unfinishedMilestones = score({
  tasks: [{ status: 'todo', dueDate: today, completedAt: null }],
  goals: [{ id: 'active-goal', status: 'active' }],
  milestones: [
    { goalId: 'active-goal', status: 'active' },
    { goalId: 'active-goal', status: 'active' },
  ],
});
assert.equal(unfinishedMilestones.scoreBreakdown.milestoneProgress, 0);
assert.equal(unfinishedMilestones.scoreBreakdown.overdueControl, 20);
console.log(`Fixture (b) active milestones, none done, task due: milestone points ${unfinishedMilestones.scoreBreakdown.milestoneProgress}.`);

const completedNoMilestones = score({
  tasks: [
    { status: 'done', dueDate: today, completedAt: new Date('2026-03-15T08:00:00Z') },
    { status: 'done', dueDate: '2026-03-14', completedAt: new Date('2026-03-14T08:00:00Z') },
  ],
});
assert.equal(completedNoMilestones.scoreBreakdown.completion, 50);
assert.equal(completedNoMilestones.scoreBreakdown.overdueControl, 20);
assert.equal(completedNoMilestones.scoreBreakdown.milestoneProgress, 0);
assert.equal(completedNoMilestones.scoreBreakdown.streak, 2.86);
assert.equal(completedNoMilestones.score, 73);
console.log(`Fixture (c) all tasks done in window, no milestones: completion ${completedNoMilestones.scoreBreakdown.completion} + overdue ${completedNoMilestones.scoreBreakdown.overdueControl} + streak ${completedNoMilestones.scoreBreakdown.streak} = score ${completedNoMilestones.score}.`);

console.log('Roadmap scoring verification passed: empty, 14-day window, old overdue, yesterday streak, suggested exclusion, paused milestones, PKT date boundary, and all three approved-formula fixtures.');
