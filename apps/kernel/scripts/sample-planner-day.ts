import {
  buildPlannerPlan,
  type PlannerEngineInput,
} from '@/lib/planner/engine';

const date = '2024-01-02';
const settings = {
  wakeTime: '05:00',
  sleepTime: '23:00',
  breakMinutes: 5,
  minSessionMinutes: 25,
  slackPercent: 15,
  defaultTaskMinutes: 30,
  weekStart: 1,
};

const prayerBlocks = [
  { title: 'Fajr', minute: 5 * 60 + 30 },
  { title: 'Dhuhr', minute: 12 * 60 + 15 },
  { title: 'Asr', minute: 15 * 60 + 30 },
  { title: 'Maghrib', minute: 17 * 60 + 45 },
  { title: 'Isha', minute: 19 * 60 },
].map(({ title, minute }, index) => ({
  id: `prayer-${index}`,
  title,
  kind: 'prayer' as const,
  startMinute: minute - 10,
  endMinute: minute + 20,
}));

const input: PlannerEngineInput = {
  date,
  nowMinute: 300,
  settings,
  fixedBlocks: [
    ...prayerBlocks,
    { id: 'lecture-1', title: 'Lecture', kind: 'commitment', startMinute: 540, endMinute: 660 },
    { id: 'lecture-2', title: 'Lecture', kind: 'commitment', startMinute: 840, endMinute: 930 },
  ],
  roadmapTasks: [
    { id: 'overdue-task', title: 'Finish overdue report', dueDate: '2024-01-01', estimateMinutes: 30, priority: 2 },
    { id: 'due-task', title: 'Prepare project submission', dueDate: date, estimateMinutes: 60, priority: 1 },
  ],
  tracks: [
    { id: 'docker', title: 'Docker', weeklyTargetMinutes: 300, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any', allowedWeekdays: 127, priority: 'medium' },
    { id: 'dsa', title: 'DSA', weeklyTargetMinutes: 420, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any', allowedWeekdays: 127, priority: 'high' },
    { id: 'arabic', title: 'Arabic', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any', allowedWeekdays: 127, priority: 'medium' },
    { id: 'german', title: 'German', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any', allowedWeekdays: 127, priority: 'medium' },
    { id: 'linkedin', title: 'LinkedIn', weeklyTargetMinutes: 60, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any', allowedWeekdays: 127, priority: 'low' },
  ],
  trackMinutesDone: {},
};

const result = buildPlannerPlan(input);
const rows = result.sessions.map((session) => ({
  start: session.startTime,
  end: session.endTime,
  kind: session.kind,
  title: session.title,
  minutes: session.plannedMinutes,
}));
const widths = {
  start: Math.max(5, ...rows.map((row) => row.start.length)),
  end: Math.max(5, ...rows.map((row) => row.end.length)),
  kind: Math.max(4, ...rows.map((row) => row.kind.length)),
  title: Math.max(5, ...rows.map((row) => row.title.length)),
  minutes: 7,
};
const line = `+${'-'.repeat(widths.start + 2)}+${'-'.repeat(widths.end + 2)}+${'-'.repeat(widths.kind + 2)}+${'-'.repeat(widths.title + 2)}+${'-'.repeat(widths.minutes + 2)}+`;
const printRow = (values: Record<keyof typeof widths, string>) =>
  `| ${values.start.padEnd(widths.start)} | ${values.end.padEnd(widths.end)} | ${values.kind.padEnd(widths.kind)} | ${values.title.padEnd(widths.title)} | ${values.minutes.padStart(widths.minutes)} |`;

console.log(`Sample plan for Tuesday ${date}`);
console.log(line);
console.log(printRow({ start: 'start', end: 'end', kind: 'kind', title: 'title', minutes: 'minutes' }));
console.log(line);
for (const row of rows) {
  console.log(printRow({
    start: row.start,
    end: row.end,
    kind: row.kind,
    title: row.title,
    minutes: String(row.minutes),
  }));
}
console.log(line);
console.log('Dropped:');
if (result.dropped.length === 0) console.log('  (none)');
for (const item of result.dropped) {
  console.log(`  - ${item.title}: ${item.reason} (${item.remainingMinutes} minutes)`);
}
