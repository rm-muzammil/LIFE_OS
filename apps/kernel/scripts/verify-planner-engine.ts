import assert from 'node:assert/strict';
import {
  buildPlannerPlan,
  dispatchGenerationMode,
  getReplaceablePlannerEntryIds,
  getTrackDailyQuota,
  type PlannerEngineInput,
  type TrackCandidate,
} from '@/lib/planner/engine';
import { parseTimeToMinutes } from '@/lib/planner/time';

const settings = {
  wakeTime: '05:00',
  sleepTime: '23:00',
  breakMinutes: 5,
  minSessionMinutes: 25,
  slackPercent: 0,
  defaultTaskMinutes: 30,
  weekStart: 1,
};

function makeInput(overrides: Partial<PlannerEngineInput> = {}): PlannerEngineInput {
  return {
    date: '2024-01-03',
    nowMinute: 300,
    settings,
    fixedBlocks: [],
    roadmapTasks: [],
    tracks: [],
    trackMinutesDone: {},
    ...overrides,
  };
}

function track(overrides: Partial<TrackCandidate> = {}): TrackCandidate {
  return {
    id: 'track-1',
    title: 'Arabic',
    weeklyTargetMinutes: 300,
    minSessionMinutes: 25,
    maxSessionMinutes: 90,
    maxPerDayMinutes: 90,
    preferredWindow: 'any',
    allowedWeekdays: 0b1111111,
    priority: 'medium',
    ...overrides,
  };
}

function minute(time: string): number {
  const parsed = parseTimeToMinutes(time);
  assert.notEqual(parsed, null);
  return parsed!;
}

function assertNoFixedOverlap(result: ReturnType<typeof buildPlannerPlan>, blocks: PlannerEngineInput['fixedBlocks']) {
  for (const session of result.sessions) {
    const start = minute(session.startTime);
    const end = minute(session.endTime);
    for (const block of blocks) {
      assert.ok(
        end <= block.startMinute || start >= block.endMinute,
        `${session.title} overlaps ${block.title}`
      );
    }
  }
}

const overlapPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'lecture', title: 'Lecture', kind: 'commitment', startMinute: 600, endMinute: 720 },
    { id: 'prayer', title: 'Dhuhr', kind: 'prayer', startMinute: 750, endMinute: 840 },
  ],
  roadmapTasks: [{ id: 'task-1', title: 'Write report', dueDate: '2024-01-03', estimateMinutes: 180, priority: 1 }],
}));
assertNoFixedOverlap(overlapPlan, [
  { id: 'lecture', title: 'Lecture', kind: 'commitment', startMinute: 600, endMinute: 720 },
  { id: 'prayer', title: 'Dhuhr', kind: 'prayer', startMinute: 750, endMinute: 840 },
]);
for (const session of overlapPlan.sessions) {
  const start = minute(session.startTime);
  const end = minute(session.endTime);
  assert.ok(start >= 300 && end <= 1380, 'session stays in the awake window');
}
console.log('PASS fixed-block avoidance and sessions stay inside the day window');

const duePlan = buildPlannerPlan(makeInput({
  roadmapTasks: [
    { id: 'later', title: 'Later due task', dueDate: '2024-01-03', estimateMinutes: 25, priority: 1 },
    { id: 'overdue', title: 'Overdue task', dueDate: '2024-01-01', estimateMinutes: 25, priority: 5 },
    { id: 'future', title: 'Not yet due', dueDate: '2024-01-04', estimateMinutes: 25, priority: 1 },
  ],
}));
assert.equal(duePlan.sessions[0]?.roadmapTaskId, 'overdue');
assert.equal(duePlan.sessions.some((session) => session.roadmapTaskId === 'future'), false);
console.log('PASS overdue task ordering and future tasks excluded');

const quotaTrack = track();
const wednesdayQuota = getTrackDailyQuota({
  date: '2024-01-03',
  weekStart: 1,
  track: quotaTrack,
  minutesDone: 120,
});
assert.equal(wednesdayQuota.remainingAllowedDays, 5);
assert.equal(wednesdayQuota.targetMinutes, 36);
assert.equal(wednesdayQuota.cappedMinutes, 36);
let distributedMinutes = 0;
let completedMinutes = 120;
for (const date of ['2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07']) {
  const daily = getTrackDailyQuota({
    date,
    weekStart: 1,
    track: quotaTrack,
    minutesDone: completedMinutes,
  });
  distributedMinutes += daily.cappedMinutes;
  completedMinutes += daily.cappedMinutes;
}
assert.equal(distributedMinutes, 180);
const fridayQuota = getTrackDailyQuota({
  date: '2024-01-05',
  weekStart: 1,
  track: track({ maxPerDayMinutes: 45 }),
  minutesDone: 120,
});
assert.equal(fridayQuota.remainingAllowedDays, 3);
assert.equal(fridayQuota.targetMinutes, 60);
assert.equal(fridayQuota.cappedMinutes, 45);
const skippedDayPlan = buildPlannerPlan(makeInput({
  date: '2024-01-05',
  tracks: [track({ maxPerDayMinutes: 45 })],
  trackMinutesDone: { 'track-1': 120 },
}));
assert.equal(skippedDayPlan.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0), 45);
assert.ok(skippedDayPlan.dropped.some((item) => item.reason === 'quota-capped' && item.remainingMinutes === 15));
console.log('PASS weekly quota distribution and skipped-day catch-up cap');

const morningPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'afternoon', title: 'Commitment', kind: 'commitment', startMinute: 660, endMinute: 1380 },
  ],
  tracks: [track({ preferredWindow: 'morning', weeklyTargetMinutes: 25, allowedWeekdays: 1 << 3 })],
}));
assert.ok(morningPlan.sessions.length > 0);
assert.ok(minute(morningPlan.sessions[0].startTime) < 660, 'matching morning gap is preferred');
const fallbackPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'day', title: 'Commitment', kind: 'commitment', startMinute: 300, endMinute: 1200 },
  ],
  tracks: [track({ preferredWindow: 'morning', weeklyTargetMinutes: 25, allowedWeekdays: 1 << 3 })],
}));
assert.equal(fallbackPlan.sessions[0]?.startTime, '20:00');
console.log('PASS preferred window with fallback when the preferred window is unavailable');

const weekdayPlan = buildPlannerPlan(makeInput({
  tracks: [track({ allowedWeekdays: 1 << 5, weeklyTargetMinutes: 300 })],
}));
assert.equal(weekdayPlan.sessions.length, 0);
console.log('PASS allowed weekdays are respected');

const overbookedPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'rest', title: 'Rest of day', kind: 'sleep', startMinute: 350, endMinute: 1380 },
  ],
  roadmapTasks: [{ id: 'large', title: 'Large task', dueDate: '2024-01-03', estimateMinutes: 100, priority: 1 }],
}));
assert.ok(overbookedPlan.dropped.some((item) => item.reason === 'overbooked'));
console.log('PASS overbooked day returns a dropped list');

const replaceable = getReplaceablePlannerEntryIds([
  { id: 'done', status: 'done', source: 'planner', startTime: '13:00' },
  { id: 'past', status: 'pending', source: 'planner', startTime: '11:00' },
  { id: 'locked', status: 'pending', source: 'planner', startTime: '14:00', locked: true },
  { id: 'manual', status: 'pending', source: 'manual', startTime: '14:00' },
  { id: 'future', status: 'pending', source: 'planner', startTime: '15:00' },
], 'from-now', 720);
assert.deepEqual(replaceable, ['future']);
assert.deepEqual(getReplaceablePlannerEntryIds([
  { id: 'past', status: 'pending', source: 'planner', startTime: '11:00' },
  { id: 'locked', status: 'pending', source: 'planner', startTime: '14:00', locked: true },
  { id: 'future', status: 'pending', source: 'planner', startTime: '15:00' },
], 'full', 720), ['locked', 'future']);
console.log('PASS replanning from now preserves done, past, locked and non-planner entries');

const deterministicInput = makeInput({
  roadmapTasks: [
    { id: 'b', title: 'B', dueDate: '2024-01-03', estimateMinutes: 40, priority: 2 },
    { id: 'a', title: 'A', dueDate: '2024-01-03', estimateMinutes: 40, priority: 1 },
  ],
  tracks: [track({ id: 'high', title: 'High', priority: 'high' }), track({ id: 'low', title: 'Low', priority: 'low' })],
});
assert.deepEqual(buildPlannerPlan(deterministicInput), buildPlannerPlan(deterministicInput));
console.log('PASS deterministic output');

const jumuahBlock = { id: 'jumuah', title: 'Jumuah', kind: 'prayer' as const, startMinute: 720, endMinute: 810 };
const fridayPlan = buildPlannerPlan(makeInput({
  date: '2024-01-05',
  fixedBlocks: [jumuahBlock],
  roadmapTasks: [{ id: 'friday-task', title: 'Friday task', dueDate: '2024-01-05', estimateMinutes: 600, priority: 1 }],
}));
assertNoFixedOverlap(fridayPlan, [jumuahBlock]);
console.log('PASS Friday Jumuah block is respected');

const slackPlan = buildPlannerPlan(makeInput({
  settings: { ...settings, slackPercent: 20 },
  roadmapTasks: [{ id: 'fill', title: 'Fill available time', dueDate: '2024-01-03', estimateMinutes: 5000, priority: 1 }],
}));
const occupiedWithBreaks = slackPlan.sessions.reduce(
  (total, session) => total + session.plannedMinutes + settings.breakMinutes,
  0
);
assert.ok(occupiedWithBreaks <= slackPlan.schedulableMinutes);
assert.equal(slackPlan.schedulableMinutes, Math.floor(slackPlan.freeMinutes * 0.8));
console.log('PASS slack percent remains unscheduled');

const splitPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'first-block', title: 'Block', kind: 'commitment', startMinute: 345, endMinute: 400 },
    { id: 'second-block', title: 'Block', kind: 'commitment', startMinute: 445, endMinute: 1380 },
  ],
  roadmapTasks: [{ id: 'split', title: 'Long task', dueDate: '2024-01-03', estimateMinutes: 90, priority: 1 }],
}));
assert.ok(splitPlan.sessions.length >= 2);
assert.ok(splitPlan.sessions.every((session) => session.plannedMinutes <= 40));
assert.ok(splitPlan.dropped.some((item) => item.id === 'roadmap-split' && item.remainingMinutes === 10));
console.log('PASS task longer than every gap is split and remaining work is reported');

for (const fixture of [
  { wakeTime: '08:00', sleepTime: '02:00', expectedStart: 480, label: '08:00 / 02:00' },
  { wakeTime: '05:00', sleepTime: '00:30', expectedStart: 300, label: '05:00 / 00:30' },
  { wakeTime: '05:00', sleepTime: '23:00', expectedStart: 300, label: '05:00 / 23:00' },
]) {
  const plan = buildPlannerPlan(makeInput({
    nowMinute: fixture.expectedStart,
    settings: { ...settings, wakeTime: fixture.wakeTime, sleepTime: fixture.sleepTime },
    roadmapTasks: [{
      id: 'fill-day',
      title: 'Fill day',
      dueDate: '2024-01-03',
      estimateMinutes: 5000,
      priority: 1,
    }],
  }));
  assert.ok(plan.sessions.length > 0, `${fixture.label} schedules the awake day`);
  assert.ok(plan.sessions.every((session) =>
    minute(session.startTime) >= fixture.expectedStart &&
    minute(session.endTime) <= (fixture.sleepTime > fixture.wakeTime ? minute(fixture.sleepTime) : 1439)
  ), `${fixture.label} sessions remain inside the day and do not cross midnight`);
  assert.ok(plan.sessions.every((session) => session.endTime !== '24:00'));
}
console.log('PASS overnight sleep windows: 08:00 / 02:00, 05:00 / 00:30, and 05:00 / 23:00');

let plannerCalled = false;
let legacyCalled = false;
const selectedPath = dispatchGenerationMode({
  engineEnabled: false,
  planner: () => { plannerCalled = true; return 'planner'; },
  legacy: () => { legacyCalled = true; return 'legacy'; },
});
assert.equal(selectedPath, 'legacy');
assert.equal(plannerCalled, false);
assert.equal(legacyCalled, true);
console.log('PASS disabled engine never invokes planner generation path');

console.log('All planner engine verification checks passed.');
