import assert from 'node:assert/strict';
import {
  buildPlannerPlan,
  dispatchGenerationMode,
  getReplaceablePlannerEntryIds,
  getTrackDailyQuota,
  getTrackSessionSizes,
  spreadSessionsAcrossAllowedDays,
  type PlannerEngineInput,
  type TrackCandidate,
} from '@/lib/planner/engine';
import { buildFixedBlocks } from '@/lib/planner/blocks';
import { DEFAULT_PLANNER_SETTINGS, type PlannerCommitmentRow } from '@/lib/planner/types';
import { formatMinutesAsTime, parseTimeToMinutes } from '@/lib/planner/time';
import { parseCommitmentInput, parseSettingsInput } from '@/lib/planner/validation';

const settings = {
  wakeTime: '05:00',
  sleepTime: '23:00',
  breakMinutes: 5,
  minSessionMinutes: 25,
  slackPercent: 0,
  defaultTaskMinutes: 30,
  preferredSessionMinutes: 45,
  weekStart: 1,
  stretchEnabled: false,
  stretchCapPercent: 150,
  maxDailyFocusMinutes: 300,
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
      assert.ok(end <= block.startMinute || start >= block.endMinute, `${session.title} overlaps ${block.title}`);
    }
  }
}

const fixedBlocks = [
  { id: 'lecture', title: 'Lecture', kind: 'commitment' as const, startMinute: 600, endMinute: 720 },
  { id: 'prayer', title: 'Dhuhr', kind: 'prayer' as const, startMinute: 750, endMinute: 840 },
];
const overlapPlan = buildPlannerPlan(makeInput({
  fixedBlocks,
  roadmapTasks: [{ id: 'task-1', title: 'Write report', dueDate: '2024-01-03', estimateMinutes: 180, priority: 1 }],
}));
assertNoFixedOverlap(overlapPlan, fixedBlocks);
for (const session of overlapPlan.sessions) {
  assert.ok(minute(session.startTime) >= 300 && minute(session.endTime) <= 1380);
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

const linkedin = track({
  id: 'linkedin',
  title: 'LinkedIn',
  weeklyTargetMinutes: 60,
  minSessionMinutes: 25,
  maxSessionMinutes: 45,
  maxPerDayMinutes: 90,
});
const linkedinDistribution = spreadSessionsAcrossAllowedDays(2, 7);
assert.deepEqual(linkedinDistribution, [0, 0, 0, 1, 0, 0, 1]);
assert.deepEqual(spreadSessionsAcrossAllowedDays(7, 6), [1, 1, 1, 1, 1, 2]);
assert.deepEqual(spreadSessionsAcrossAllowedDays(10, 6), [1, 2, 2, 1, 2, 2]);
assert.deepEqual(getTrackSessionSizes(60, 2, 25, 45), [30, 30]);
assert.deepEqual(
  getTrackDailyQuota({
    date: '2024-01-01',
    weekStart: 1,
    preferredSessionMinutes: 45,
    track: linkedin,
    minutesDone: 0,
  }).sessionMinutesToday,
  []
);
const noLinkedInToday = buildPlannerPlan(makeInput({
  date: '2024-01-02',
  tracks: [linkedin],
}));
assert.deepEqual(noLinkedInToday.sessions, []);
assert.deepEqual(noLinkedInToday.dropped, []);
console.log('PASS LinkedIn 60 minutes spreads as two 30-minute sessions on separated days');

const docker = track({
  id: 'docker',
  title: 'Docker',
  weeklyTargetMinutes: 300,
  maxSessionMinutes: 90,
});
const arabic = track({ id: 'arabic', title: 'Arabic', weeklyTargetMinutes: 150 });
const german = track({ id: 'german', title: 'German', weeklyTargetMinutes: 150 });
assert.equal(getTrackDailyQuota({
  date: '2024-01-02',
  weekStart: 1,
  preferredSessionMinutes: 45,
  track: docker,
  minutesDone: 0,
}).sessionsToday, 1);
const dsaTuesday = getTrackDailyQuota({
  date: '2024-01-02',
  weekStart: 1,
  preferredSessionMinutes: 45,
  track: track({ id: 'dsa', title: 'DSA', weeklyTargetMinutes: 420, maxSessionMinutes: 45 }),
  minutesDone: 0,
});
assert.equal(dsaTuesday.sessionsToday, 1);
for (const language of [arabic, german]) {
  const firstDay = getTrackDailyQuota({
    date: '2024-01-02',
    weekStart: 1,
    preferredSessionMinutes: 45,
    track: language,
    minutesDone: 0,
  });
  const secondDay = getTrackDailyQuota({
    date: '2024-01-04',
    weekStart: 1,
    preferredSessionMinutes: 45,
    track: language,
    minutesDone: 0,
  });
  assert.equal(firstDay.sessionsToday, 0);
  assert.equal(secondDay.sessionsToday, 1);
}
console.log('PASS cumulative quotas spread 7 and 10 sessions across six days and defer 4-session tracks on day zero');

let dsaDone = 0;
let dsaScheduled = 0;
const dsa = track({ id: 'dsa', title: 'DSA', weeklyTargetMinutes: 420, maxSessionMinutes: 45 });
let dsaSessionCount = 0;
for (const date of [
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04',
  '2024-01-05', '2024-01-06', '2024-01-07',
]) {
  const daily = getTrackDailyQuota({
    date,
    weekStart: 1,
    preferredSessionMinutes: 45,
    track: dsa,
    minutesDone: dsaDone,
  });
  const minutes = daily.sessionMinutesToday.reduce((sum, value) => sum + value, 0);
  dsaScheduled += minutes;
  dsaSessionCount += daily.sessionMinutesToday.length;
  dsaDone += minutes;
}
assert.equal(dsaScheduled, 420);
assert.ok(dsaSessionCount <= Math.ceil(dsa.weeklyTargetMinutes / 45));
console.log('PASS DSA 420-minute quota distributes over the week and totals 420 minutes');

for (const candidate of [docker, arabic, german]) {
  let done = 0;
  let sessionCount = 0;
  for (const date of [
    '2024-01-02', '2024-01-03', '2024-01-04',
    '2024-01-05', '2024-01-06', '2024-01-07',
  ]) {
    const daily = getTrackDailyQuota({
      date,
      weekStart: 1,
      preferredSessionMinutes: 45,
      track: candidate,
      minutesDone: done,
    });
    done += daily.sessionMinutesToday.reduce((sum, minutes) => sum + minutes, 0);
    sessionCount += daily.sessionMinutesToday.length;
  }
  assert.ok(sessionCount <= Math.ceil(candidate.weeklyTargetMinutes / 45));
}
console.log('PASS tracks never receive more quota sessions in the week than their calculated need');

const twentyFiveMinuteGapPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'morning-end', title: 'Lecture begins', kind: 'commitment', startMinute: 325, endMinute: 1380 },
  ],
  roadmapTasks: [{ id: '25-minute-task', title: 'Short task', dueDate: '2024-01-03', estimateMinutes: 25, priority: 1 }],
}));
assert.equal(twentyFiveMinuteGapPlan.sessions[0]?.plannedMinutes, 25);
assert.equal(twentyFiveMinuteGapPlan.sessions[0]?.endTime, '05:25');
console.log('PASS a 25-minute gap fits a 25-minute session without trailing break');

const bufferedCommitment: PlannerCommitmentRow = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'fixture-user',
  title: 'Lecture',
  kind: 'lecture',
  weekday: 2,
  date: null,
  startTime: '09:00',
  endTime: '11:00',
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 10,
  validFrom: null,
  validTo: null,
  location: null,
  notes: null,
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const bufferedBlocks = buildFixedBlocks({
  date: '2024-01-02',
  settings: DEFAULT_PLANNER_SETTINGS,
  prayers: { fajr: '05:30', dhuhr: '12:15', asr: '15:30', maghrib: '17:45', isha: '19:00' },
  commitments: [bufferedCommitment],
});
const bufferedLecture = bufferedBlocks.find((block) => block.commitmentId === bufferedCommitment.id);
assert.equal(bufferedLecture?.startMinute, 525);
assert.equal(bufferedLecture?.endMinute, 670);
const parsedBuffers = parseCommitmentInput({
  title: 'Lecture',
  kind: 'lecture',
  weekday: 2,
  date: null,
  startTime: '09:00',
  endTime: '11:00',
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 10,
});
assert.equal(parsedBuffers.ok && parsedBuffers.value.bufferBeforeMinutes, 15);
assert.equal(parsedBuffers.ok && parsedBuffers.value.bufferAfterMinutes, 10);
assert.equal(parseCommitmentInput({
  title: 'Lecture',
  kind: 'lecture',
  weekday: 2,
  date: null,
  startTime: '09:00',
  endTime: '11:00',
  bufferBeforeMinutes: 181,
}).ok, false);
console.log('PASS lecture travel buffers block 08:45 through 11:10');

const midnightCommitments: PlannerCommitmentRow[] = [
  {
    ...bufferedCommitment,
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Early commitment',
    weekday: 3,
    startTime: '00:15',
    endTime: '01:00',
    bufferBeforeMinutes: 30,
    bufferAfterMinutes: 0,
  },
  {
    ...bufferedCommitment,
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Late commitment',
    weekday: 3,
    startTime: '23:15',
    endTime: '23:50',
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 30,
  },
];
const midnightBlocks = buildFixedBlocks({
  date: '2024-01-03',
  settings: DEFAULT_PLANNER_SETTINGS,
  prayers: { fajr: '05:30', dhuhr: '12:15', asr: '15:30', maghrib: '17:45', isha: '19:00' },
  commitments: midnightCommitments,
}).filter((block) => block.kind === 'commitment');
assert.deepEqual(
  midnightBlocks.map(({ startMinute, endMinute }) => [startMinute, endMinute]),
  [[0, 60], [1395, 1440]],
);
assert.equal(midnightBlocks[0]?.startMinute, 0, 'negative before-buffer start is clipped to today');
assert.equal(formatMinutesAsTime(midnightBlocks[0]!.startMinute), '00:00');
assert.equal(formatMinutesAsTime(midnightBlocks[1]!.endMinute), '00:00');
const midnightPlan = buildPlannerPlan(makeInput({ fixedBlocks: midnightBlocks }));
assert.ok(midnightPlan.sessions.every((session) =>
  minute(session.startTime) >= 0 && minute(session.endTime) < 1440
));
const lateCommitment = midnightBlocks[1]!;
const finalMinutePlan = buildPlannerPlan(makeInput({
  nowMinute: 1438,
  fixedBlocks: [lateCommitment],
  roadmapTasks: [{
    id: 'last-minute-task',
    title: 'Last-minute task',
    dueDate: '2024-01-03',
    estimateMinutes: 1,
    priority: 1,
  }],
  settings: { ...settings, wakeTime: '23:58', sleepTime: '23:57', minSessionMinutes: 1 },
}));
assert.deepEqual(finalMinutePlan.sessions, [], 'engine cannot schedule work after the buffered block begins');
console.log('PASS engine uses midnight as the arithmetic boundary, clips early starts to today, and blocks final-minute scheduling');

const parsedEngineSettings = parseSettingsInput({
  preferredSessionMinutes: 45,
  stretchEnabled: true,
  stretchCapPercent: 200,
  maxDailyFocusMinutes: 360,
});
assert.equal(parsedEngineSettings.ok && parsedEngineSettings.value.preferredSessionMinutes, 45);
assert.equal(parsedEngineSettings.ok && parsedEngineSettings.value.stretchEnabled, true);
assert.equal(parsedEngineSettings.ok && parsedEngineSettings.value.stretchCapPercent, 200);
assert.equal(parsedEngineSettings.ok && parsedEngineSettings.value.maxDailyFocusMinutes, 360);
assert.equal(parseSettingsInput({ stretchCapPercent: 99 }).ok, false);
assert.equal(parseSettingsInput({ stretchCapPercent: 301 }).ok, false);
assert.equal(parseSettingsInput({ maxDailyFocusMinutes: 59 }).ok, false);
assert.equal(parseSettingsInput({ maxDailyFocusMinutes: 721 }).ok, false);

const dailyCapPlan = buildPlannerPlan(makeInput({
  tracks: [track({ weeklyTargetMinutes: 1000, maxPerDayMinutes: 50 })],
}));
assert.ok(dailyCapPlan.dropped.some((item) => item.reason === 'daily-cap'));
console.log('PASS track quota beyond max_per_day is reported as a daily-cap drop');

const focusCapPlan = buildPlannerPlan(makeInput({
  settings: { ...settings, maxDailyFocusMinutes: 300 },
  roadmapTasks: [{ id: 'near-cap', title: 'Due task', dueDate: '2024-01-03', estimateMinutes: 290, priority: 1 }],
  tracks: [track()],
}));
assert.equal(focusCapPlan.sessions.reduce((sum, session) => sum + session.plannedMinutes, 0), 290);
assert.ok(focusCapPlan.dropped.some((item) => item.reason === 'focus-cap'));
const overFocusCapPlan = buildPlannerPlan(makeInput({
  settings: { ...settings, maxDailyFocusMinutes: 300 },
  roadmapTasks: [{ id: 'over-cap', title: 'Over-cap due task', dueDate: '2024-01-03', estimateMinutes: 330, priority: 1 }],
  tracks: [track()],
}));
assert.equal(overFocusCapPlan.sessions[0]?.plannedMinutes, 330);
assert.ok(overFocusCapPlan.warnings.some((warning) => warning.includes('exceeding the daily focus cap')));
assert.ok(overFocusCapPlan.dropped.some((item) => item.reason === 'focus-cap'));
console.log('PASS due work is placed before focus cap, over-cap tasks warn, and quota is dropped with focus-cap');

const morningPlan = buildPlannerPlan(makeInput({
  date: '2024-01-07',
  fixedBlocks: [
    { id: 'afternoon', title: 'Commitment', kind: 'commitment', startMinute: 660, endMinute: 1380 },
  ],
  tracks: [track({ preferredWindow: 'morning', weeklyTargetMinutes: 25, allowedWeekdays: 1 << 0 })],
}));
assert.ok(morningPlan.sessions.length > 0);
assert.ok(minute(morningPlan.sessions[0].startTime) < 660);
const fallbackPlan = buildPlannerPlan(makeInput({
  date: '2024-01-07',
  fixedBlocks: [
    { id: 'day', title: 'Commitment', kind: 'commitment', startMinute: 300, endMinute: 1200 },
  ],
  tracks: [track({ preferredWindow: 'morning', weeklyTargetMinutes: 25, allowedWeekdays: 1 << 0 })],
}));
assert.equal(fallbackPlan.sessions[0]?.startTime, '20:00');
console.log('PASS preferred window with fallback when the preferred window is unavailable');

const weekdayPlan = buildPlannerPlan(makeInput({
  tracks: [track({ allowedWeekdays: 1 << 5, weeklyTargetMinutes: 300 })],
}));
assert.equal(weekdayPlan.sessions.length, 0);
assert.equal(weekdayPlan.dropped.length, 0);
console.log('PASS disallowed weekdays with no scheduled quota are not reported as dropped');

const overbookedPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [{ id: 'blocked', title: 'Blocked day', kind: 'sleep', startMinute: 300, endMinute: 1380 }],
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
console.log('PASS replanning preserves done, past, locked (from-now), and non-planner entries');

const deterministicInput = makeInput({
  roadmapTasks: [
    { id: 'b', title: 'B', dueDate: '2024-01-03', estimateMinutes: 40, priority: 2 },
    { id: 'a', title: 'A', dueDate: '2024-01-03', estimateMinutes: 40, priority: 1 },
  ],
  tracks: [
    track({ id: 'high', title: 'High', priority: 'high' }),
    track({ id: 'low', title: 'Low', priority: 'low' }),
  ],
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
const scheduledMinutes = slackPlan.sessions.reduce((total, session) => total + session.plannedMinutes, 0);
assert.ok(scheduledMinutes <= slackPlan.schedulableMinutes);
assert.equal(slackPlan.schedulableMinutes, Math.floor(slackPlan.freeMinutes * 0.8));
console.log('PASS slack percent remains unscheduled');

const splitPlan = buildPlannerPlan(makeInput({
  fixedBlocks: [
    { id: 'first', title: 'Block', kind: 'commitment', startMinute: 340, endMinute: 400 },
    { id: 'second', title: 'Block', kind: 'commitment', startMinute: 440, endMinute: 1380 },
  ],
  roadmapTasks: [{ id: 'split', title: 'Long task', dueDate: '2024-01-03', estimateMinutes: 90, priority: 1 }],
}));
assert.deepEqual(splitPlan.sessions.map((session) => session.plannedMinutes), [40, 40]);
assert.ok(splitPlan.dropped.some((item) => item.id === 'roadmap-split' && item.remainingMinutes === 10));
console.log('PASS task longer than every gap is split and remaining work is reported');

for (const fixture of [
  { wakeTime: '08:00', sleepTime: '02:00', expectedStart: 480 },
  { wakeTime: '05:00', sleepTime: '00:30', expectedStart: 300 },
  { wakeTime: '05:00', sleepTime: '23:00', expectedStart: 300 },
]) {
  const plan = buildPlannerPlan(makeInput({
    nowMinute: fixture.expectedStart,
    settings: { ...settings, wakeTime: fixture.wakeTime, sleepTime: fixture.sleepTime },
    roadmapTasks: [{ id: 'fill-day', title: 'Fill day', dueDate: '2024-01-03', estimateMinutes: 5000, priority: 1 }],
  }));
  assert.ok(plan.sessions.length > 0);
  assert.ok(plan.sessions.every((session) =>
    minute(session.startTime) >= fixture.expectedStart &&
    minute(session.endTime) <= (fixture.sleepTime > fixture.wakeTime ? minute(fixture.sleepTime) : 1439)
  ));
  assert.ok(plan.sessions.every((session) => session.endTime !== '24:00'));
}
console.log('PASS overnight sleep windows: 08:00 / 02:00, 05:00 / 00:30, and 05:00 / 23:00');

const stretchPlan = buildPlannerPlan(makeInput({
  settings: { ...settings, stretchEnabled: true },
  tracks: [track({
    weeklyTargetMinutes: 200,
    minSessionMinutes: 25,
    maxSessionMinutes: 45,
    maxPerDayMinutes: 90,
  })],
}));
const stretchTotal = stretchPlan.sessions
  .filter((session) => session.trackId === 'track-1')
  .reduce((total, session) => total + session.plannedMinutes, 0);
const stretchExtra = stretchPlan.sessions
  .filter((session) => session.trackId === 'track-1' && session.extra)
  .reduce((total, session) => total + session.plannedMinutes, 0);
assert.ok(stretchPlan.sessions.some((session) => session.extra === true));
assert.ok(stretchExtra <= 100);
assert.ok(stretchTotal <= 300);
assert.ok(stretchPlan.sessions.filter((session) => session.trackId === 'track-1')
  .every((session) => session.plannedMinutes <= 45));
console.log('PASS stretch mode fills leftover time without exceeding session or daily caps');

const noExtraForZeroTarget = buildPlannerPlan(makeInput({
  settings: { ...settings, stretchEnabled: true },
  tracks: [track({ weeklyTargetMinutes: 0 })],
}));
assert.equal(noExtraForZeroTarget.sessions.some((session) => session.extra), false);
console.log('PASS tracks with a zero weekly target never receive stretch extras');

const weightedStretchPlan = buildPlannerPlan(makeInput({
  settings: {
    ...settings,
    stretchEnabled: true,
    preferredSessionMinutes: 25,
    maxDailyFocusMinutes: 150,
  },
  tracks: [
    track({ id: 'high', title: 'High', weeklyTargetMinutes: 400, maxPerDayMinutes: 150, maxSessionMinutes: 25, priority: 'high' }),
    track({ id: 'medium', title: 'Medium', weeklyTargetMinutes: 400, maxPerDayMinutes: 150, maxSessionMinutes: 25, priority: 'medium' }),
    track({ id: 'low', title: 'Low', weeklyTargetMinutes: 400, maxPerDayMinutes: 150, maxSessionMinutes: 25, priority: 'low' }),
  ],
  trackMinutesDone: { high: 400, medium: 400, low: 400 },
}));
const weightedExtras = weightedStretchPlan.sessions
  .filter((session) => session.extra)
  .reduce<Record<string, number>>((counts, session) => {
    counts[session.trackId!] = (counts[session.trackId!] ?? 0) + 1;
    return counts;
  }, {});
assert.deepEqual(weightedExtras, { high: 3, low: 1, medium: 2 });
console.log('PASS stretch extras follow the 3:2:1 high/medium/low priority rotation');

const protectedBlocks = [
  { id: 'lecture-1-travel', title: 'Lecture 1 and travel', kind: 'commitment' as const, startMinute: 510, endMinute: 690 },
  { id: 'lunch', title: 'Lunch', kind: 'commitment' as const, startMinute: 720, endMinute: 765 },
  { id: 'lecture-2-travel', title: 'Lecture 2 and travel', kind: 'commitment' as const, startMinute: 810, endMinute: 960 },
  { id: 'dinner', title: 'Dinner', kind: 'commitment' as const, startMinute: 1200, endMinute: 1245 },
];
const protectedPlan = buildPlannerPlan(makeInput({
  date: '2024-01-02',
  fixedBlocks: protectedBlocks,
  settings: { ...settings, stretchEnabled: true },
  tracks: [docker, dsa, arabic, german, linkedin],
}));
assertNoFixedOverlap(protectedPlan, protectedBlocks);
console.log('PASS planned quota and stretch sessions never overlap lecture travel, lunch, or dinner protected time');

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
